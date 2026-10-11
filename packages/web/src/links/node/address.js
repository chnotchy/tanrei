// Which addresses the links helper will read (REQUIREMENTS.md, LKD-3 to LKD-5). Nothing here opens a connection or
// resolves a name: these are the rules, as functions of a string.
import net from 'node:net';

/** The IPv4 ranges that are not public (LKD-5). The list is data: a test holds it to REQUIREMENTS.md. */
export const NOT_PUBLIC_IPV4 = Object.freeze([
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.88.99.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
]);

/**
 * The IPv6 ranges that are not public (LKD-5). The first eight are the list of REQUIREMENTS.md; the rest are refused
 * as well, being stricter: the deprecated form that carries an IPv4 address in its last four bytes, the second
 * translation prefix, the discard prefix, the protocol assignments (tunnels among them), the second documentation
 * range and the deprecated site-local range. And an address outside 2000::/3 is not a public one at all.
 */
export const NOT_PUBLIC_IPV6 = Object.freeze([
  '::/128',
  '::1/128',
  '::ffff:0:0/96',
  '64:ff9b::/96',
  '2001:db8::/32',
  'fc00::/7',
  'fe80::/10',
  'ff00::/8',
  '::/96',
  '64:ff9b:1::/48',
  '100::/64',
  '2001::/23',
  '3fff::/20',
  'fec0::/10',
]);

/** Four bytes of a dotted address written as four decimal numbers, or null. Nothing else is an IPv4 address here. */
export function parseIPv4(text) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (!match) return null;
  const bytes = match.slice(1).map(Number);
  return bytes.every((byte) => byte <= 255) ? Uint8Array.from(bytes) : null;
}

/** Sixteen bytes of an IPv6 address, or null. A zone (`%eth0`) is not an address a name resolves to: null. */
export function parseIPv6(text) {
  if (!net.isIPv6(text) || text.includes('%')) return null;
  let head = text;
  let tail = null;
  const gap = text.indexOf('::');
  if (gap !== -1) {
    head = text.slice(0, gap);
    tail = text.slice(gap + 2);
  }
  const groups = (part) => {
    if (part === '') return [];
    const out = [];
    for (const piece of part.split(':')) {
      if (piece.includes('.')) {
        const four = parseIPv4(piece);
        if (!four) return null;
        out.push((four[0] << 8) | four[1], (four[2] << 8) | four[3]);
      } else out.push(Number.parseInt(piece, 16));
    }
    return out;
  };
  const first = groups(head);
  const last = tail === null ? [] : groups(tail);
  if (!first || !last) return null;
  const zeros = tail === null ? 0 : 8 - first.length - last.length;
  if (zeros < 0 || first.length + zeros + last.length !== 8) return null;
  const all = [...first, ...new Array(zeros).fill(0), ...last];
  const bytes = new Uint8Array(16);
  all.forEach((group, index) => {
    bytes[index * 2] = group >> 8;
    bytes[index * 2 + 1] = group & 0xff;
  });
  return bytes;
}

function inRange(bytes, range) {
  const [base, length] = range.split('/');
  const prefix = bytes.length === 4 ? parseIPv4(base) : parseIPv6(base);
  const bits = Number(length);
  for (let bit = 0; bit < bits; bit += 1) {
    const mask = 0x80 >> (bit % 8);
    if ((bytes[bit >> 3] & mask) !== (prefix[bit >> 3] & mask)) return false;
  }
  return true;
}

/**
 * Whether an address a name resolved to is a public one (LKD-5). The text is what a resolver returns: dotted decimal,
 * or IPv6. Anything that is not an address is not public.
 */
export function isPublicAddress(address) {
  if (typeof address !== 'string') return false;
  const four = parseIPv4(address);
  if (four) return !NOT_PUBLIC_IPV4.some((range) => inRange(four, range));
  const six = parseIPv6(address);
  if (!six) return false;
  if ((six[0] & 0xe0) !== 0x20) return false; // outside 2000::/3: nothing public is there
  if (NOT_PUBLIC_IPV6.some((range) => inRange(six, range))) return false;
  // 2002::/16 carries an IPv4 address in its next four bytes: public only while that address is.
  if (six[0] === 0x20 && six[1] === 0x02) return !NOT_PUBLIC_IPV4.some((range) => inRange(six.subarray(2, 6), range));
  return true;
}

/** A host without a final dot, in lower case — what the lists are matched against. */
export const bareHost = (host) => host.toLowerCase().replace(/\.$/, '');

/** `example.com` names that host; `*.example.com` names every host under it, and not the host itself. */
export function hostMatches(host, patterns) {
  const name = bareHost(host);
  return patterns.some((pattern) => {
    const wanted = bareHost(pattern);
    return wanted.startsWith('*.') ? name.endsWith(wanted.slice(1)) && name.length > wanted.length - 1 : name === wanted;
  });
}

/**
 * LKD-3 and LKD-4, for an address as it was written: the URL the helper may ask, or the reason it will not. Nothing
 * is resolved. The URL parser has already turned every spelling of a numeric host (decimal, octal, hexadecimal, short
 * forms) into dotted decimal, so one test catches them all.
 */
export function readableAddress(address, { allow, deny } = {}) {
  let url;
  try {
    url = address instanceof URL ? address : new URL(address);
  } catch {
    return { ok: false };
  }
  if (url.protocol !== 'https:') return { ok: false };
  if (url.username !== '' || url.password !== '') return { ok: false };
  if (url.port !== '') return { ok: false }; // the parser drops the scheme's own port, so any port left is another
  const host = bareHost(url.hostname);
  if (host === '' || host.startsWith('[') || net.isIP(host) !== 0) return { ok: false };
  if (deny && hostMatches(host, deny)) return { ok: false };
  if (allow && !hostMatches(host, allow)) return { ok: false };
  return { ok: true, url, host };
}

/** The host without a leading `www.` (LKD-9: adding or removing it is not another host). */
export const withoutWww = (host) => bareHost(host).replace(/^www\./, '');
