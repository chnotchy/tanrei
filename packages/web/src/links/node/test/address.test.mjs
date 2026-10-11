// REQUIREMENTS.md, LKD-3 to LKD-5: which addresses the helper will read — the rules as functions of a string.
import './helpers/network.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { asked } from './helpers/network.mjs';
import { address } from './helpers/module.mjs';

const { isPublicAddress, readableAddress, hostMatches, NOT_PUBLIC_IPV4, NOT_PUBLIC_IPV6 } = address;

test('LKD-3: only an https address of a named host, on its own port, without credentials, is one the helper reads', () => {
  for (const ok of ['https://example.com/', 'https://example.com:443/a?b=c#d', 'https://sub.example.co.jp/x', 'HTTPS://EXAMPLE.COM/']) assert.equal(readableAddress(ok).ok, true, ok);
  const refused = [
    'http://example.com/', // not https
    'ftp://example.com/',
    'file:///etc/passwd',
    'data:text/html,<title>x</title>',
    'javascript:alert(1)',
    '//example.com/',
    'example.com',
    '',
    'https://user@example.com/', // a user name
    'https://user:secret@example.com/', // and a password
    'https://:secret@example.com/',
    'https://example.com:8443/', // a port that is not the scheme's own
    'https://example.com:80/',
    'https://127.0.0.1/', // a numeric address, in every spelling
    'https://[::1]/',
    'https://[::ffff:127.0.0.1]/',
    'https://[2606:4700::1111]/',
    'https://8.8.8.8/',
  ];
  for (const address of refused) assert.equal(readableAddress(address).ok, false, address);
});

test('LKD-3: a numeric host is refused in its decimal, octal, hexadecimal and short spellings', () => {
  // All of these are 127.0.0.1 (or 10.0.0.1, 169.254.169.254) to an address parser.
  for (const host of ['2130706433', '0x7f000001', '017700000001', '0177.0.0.1', '0x7f.0.0.1', '127.1', '127.0.1', '0x7f.1', '0', '167772161', '0xa9fea9fe', '0251.0376.0251.0376', '2852039166']) {
    assert.equal(readableAddress(`https://${host}/`).ok, false, host);
  }
});

test('LKD-4: allow names the only hosts read, deny wins over allow, and *.host takes subdomains and not the host itself', () => {
  assert.equal(hostMatches('example.com', ['example.com']), true);
  assert.equal(hostMatches('EXAMPLE.com.', ['example.com']), true);
  assert.equal(hostMatches('a.example.com', ['example.com']), false);
  assert.equal(hostMatches('a.example.com', ['*.example.com']), true);
  assert.equal(hostMatches('a.b.example.com', ['*.example.com']), true);
  assert.equal(hostMatches('example.com', ['*.example.com']), false);
  assert.equal(hostMatches('notexample.com', ['*.example.com']), false);
  assert.equal(hostMatches('example.com.evil.test', ['example.com']), false);
  assert.equal(readableAddress('https://example.com/', { allow: ['example.com'] }).ok, true);
  assert.equal(readableAddress('https://other.test/', { allow: ['example.com'] }).ok, false);
  assert.equal(readableAddress('https://other.test/', { deny: ['other.test'] }).ok, false);
  assert.equal(readableAddress('https://a.example.com/', { allow: ['*.example.com'], deny: ['a.example.com'] }).ok, false);
  assert.equal(readableAddress('https://b.example.com/', { allow: ['*.example.com'], deny: ['a.example.com'] }).ok, true);
});

// The list of REQUIREMENTS.md ("Public addresses (LKD-5)"), as data: each range with its first and its last address.
const IPV4 = [
  ['0.0.0.0/8', '0.0.0.0', '0.255.255.255'],
  ['10.0.0.0/8', '10.0.0.0', '10.255.255.255'],
  ['100.64.0.0/10', '100.64.0.0', '100.127.255.255'],
  ['127.0.0.0/8', '127.0.0.0', '127.255.255.255'],
  ['169.254.0.0/16', '169.254.0.0', '169.254.255.255'],
  ['172.16.0.0/12', '172.16.0.0', '172.31.255.255'],
  ['192.0.0.0/24', '192.0.0.0', '192.0.0.255'],
  ['192.0.2.0/24', '192.0.2.0', '192.0.2.255'],
  ['192.88.99.0/24', '192.88.99.0', '192.88.99.255'],
  ['192.168.0.0/16', '192.168.0.0', '192.168.255.255'],
  ['198.18.0.0/15', '198.18.0.0', '198.19.255.255'],
  ['198.51.100.0/24', '198.51.100.0', '198.51.100.255'],
  ['203.0.113.0/24', '203.0.113.0', '203.0.113.255'],
  ['224.0.0.0/4', '224.0.0.0', '239.255.255.255'],
  ['240.0.0.0/4', '240.0.0.0', '255.255.255.255'],
];
const IPV6 = [
  ['::/128', '::', '::'],
  ['::1/128', '::1', '::1'],
  ['::ffff:0:0/96', '::ffff:0.0.0.0', '::ffff:255.255.255.255'],
  ['64:ff9b::/96', '64:ff9b::', '64:ff9b::ffff:ffff'],
  ['2001:db8::/32', '2001:db8::', '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff'],
  ['fc00::/7', 'fc00::', 'fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
  ['fe80::/10', 'fe80::', 'febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
  ['ff00::/8', 'ff00::', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
];

test('LKD-5: the list of addresses that are not public is the list of the requirements, as data', () => {
  assert.deepEqual(NOT_PUBLIC_IPV4, IPV4.map(([range]) => range));
  assert.deepEqual(NOT_PUBLIC_IPV6.slice(0, IPV6.length), IPV6.map(([range]) => range));
});

for (const [range, first, last] of [...IPV4, ...IPV6]) {
  test(`LKD-5: ${range} is not public, from its first address to its last`, () => {
    assert.equal(isPublicAddress(first), false, first);
    assert.equal(isPublicAddress(last), false, last);
  });
}

test('LKD-5: the addresses just outside each range are public', () => {
  for (const address of ['1.0.0.0', '9.255.255.255', '11.0.0.0', '100.63.255.255', '100.128.0.0', '126.255.255.255', '128.0.0.0', '169.253.255.255', '169.255.0.0', '172.15.255.255', '172.32.0.0', '192.0.1.0', '192.0.3.0', '192.88.98.255', '192.88.100.0', '192.167.255.255', '192.169.0.0', '198.17.255.255', '198.20.0.0', '198.51.99.255', '198.51.101.0', '203.0.112.255', '203.0.114.0', '223.255.255.255', '8.8.8.8', '93.184.216.34']) {
    assert.equal(isPublicAddress(address), true, address);
  }
  for (const address of ['2606:4700::1111', '2a00:1450:4001:81b::200e', '2001:4860:4860::8888', '2400:cb00::1']) assert.equal(isPublicAddress(address), true, address);
});

test('LKD-5: the address a hosting provider keeps for a machine\'s own configuration and credentials is not public, in any form', () => {
  for (const address of ['169.254.169.254', '169.254.170.2', '::ffff:169.254.169.254', '::ffff:a9fe:a9fe', '64:ff9b::a9fe:a9fe', '2002:a9fe:a9fe::1', 'fd00:a9fe::254', '100.100.100.200']) assert.equal(isPublicAddress(address), false, address);
});

test('LKD-5: an IPv6 form that carries a private IPv4 address is not public', () => {
  const carried = [
    '::ffff:127.0.0.1', // mapped, written with dots
    '::ffff:7f00:1', // mapped, written in hexadecimal
    '0:0:0:0:0:ffff:0a00:0001', // mapped, written in full
    '::ffff:10.0.0.1',
    '::ffff:192.168.1.1',
    '::ffff:8.8.8.8', // the mapped range is refused whole: a resolver does not answer with it
    '::127.0.0.1', // the deprecated compatible form
    '::7f00:1',
    '64:ff9b::7f00:1', // translated
    '64:ff9b::10.0.0.1',
    '64:ff9b:1::a00:1',
    '2002:7f00:0001::', // 6to4 of 127.0.0.1
    '2002:0a00:0001::1', // of 10.0.0.1
    '2002:c0a8:0101::1', // of 192.168.1.1
    '2002:ac10:0001::1', // of 172.16.0.1
    '2002:6440:0001::1', // of 100.64.0.1
    '2001:0:4136:e378:8000:63bf:3fff:fdd2', // a tunnel's address
  ];
  for (const address of carried) assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress('2002:0808:0808::1'), true, '6to4 of a public address');
});

test('LKD-5: unique-local, link-local, site-local, multicast, unspecified, discard and documentation IPv6 addresses are not public', () => {
  for (const address of ['fc00::1', 'fd12:3456:789a::1', 'fe80::1', 'fe80::1ff:fe23:4567:890a', 'fec0::1', 'ff02::1', 'ff05::2', '::', '::1', '100::1', '2001:db8::1', '3fff::1', '4000::1', '1::1']) assert.equal(isPublicAddress(address), false, address);
});

test('LKD-5: what is not an address is not public', () => {
  for (const value of ['localhost', '', '1.2.3', '1.2.3.4.5', '256.1.1.1', '0x7f.0.0.1', '017.0.0.1 ', 'fe80::1%lo0', '2606:4700::1111%en0', 'example.com', undefined, null, 2130706433, {}]) assert.equal(isPublicAddress(value), false, String(value));
});

test('the platform was asked to resolve no name', () => assert.deepEqual(asked, []));
