// A certificate for the tests' own server, made here with the platform's cryptography: self-signed, for the names the
// tests use, valid for two days around now. The fetcher verifies it as it verifies any (LKD-7): the tests' seam names
// it as the one authority they trust, and a second one, which nothing trusts, shows that an unknown one is refused.
import crypto from 'node:crypto';

const length = (size) => (size < 0x80 ? Buffer.from([size]) : size < 0x100 ? Buffer.from([0x81, size]) : Buffer.from([0x82, size >> 8, size & 0xff]));
const tlv = (tag, ...parts) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([Buffer.from([tag]), length(body.length), body]);
};
const sequence = (...parts) => tlv(0x30, ...parts);
const oid = (dotted) => {
  const [first, second, ...rest] = dotted.split('.').map(Number);
  const bytes = [40 * first + second];
  for (const value of rest) {
    const stack = [value & 0x7f];
    for (let left = value >> 7; left; left >>= 7) stack.unshift((left & 0x7f) | 0x80);
    bytes.push(...stack);
  }
  return tlv(0x06, Buffer.from(bytes));
};
const integer = (bytes) => tlv(0x02, bytes[0] & 0x80 ? Buffer.concat([Buffer.from([0]), bytes]) : bytes);
const time = (date) => tlv(0x17, Buffer.from(`${date.toISOString().replace(/[-:T]/g, '').slice(2, 14)}Z`));

export function selfSigned(names) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const algorithm = sequence(oid('1.2.840.10045.4.3.2'));
  const name = sequence(tlv(0x31, sequence(oid('2.5.4.3'), tlv(0x0c, Buffer.from('links test')))));
  const alternative = sequence(oid('2.5.29.17'), tlv(0x04, sequence(...names.map((entry) => tlv(0x82, Buffer.from(entry))))));
  const authority = sequence(oid('2.5.29.19'), tlv(0x01, Buffer.from([0xff])), tlv(0x04, sequence(tlv(0x01, Buffer.from([0xff])))));
  const day = 24 * 60 * 60 * 1000;
  const serial = crypto.randomBytes(8);
  serial[0] &= 0x7f;
  serial[0] |= 0x01;
  const body = sequence(
    tlv(0xa0, integer(Buffer.from([2]))),
    integer(serial),
    algorithm,
    name,
    sequence(time(new Date(Date.now() - day)), time(new Date(Date.now() + day))),
    name,
    publicKey.export({ type: 'spki', format: 'der' }),
    tlv(0xa3, sequence(alternative, authority)),
  );
  const signature = crypto.sign('sha256', body, privateKey);
  const der = sequence(body, algorithm, tlv(0x03, Buffer.from([0]), signature));
  return {
    cert: `-----BEGIN CERTIFICATE-----\n${der.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`,
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
}
