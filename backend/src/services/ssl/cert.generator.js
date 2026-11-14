const crypto = require("crypto");
const { generateKeyPairSync, createSign } = crypto;

function encodeLength(len) {
  if (len < 128) return Buffer.from([len]);
  const b = [];
  let temp = len;
  while (temp > 0) {
    b.unshift(temp & 0xff);
    temp >>= 8;
  }
  return Buffer.from([0x80 | b.length, ...b]);
}

function tag(t, content) {
  const c = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return Buffer.concat([Buffer.from([t]), encodeLength(c.length), c]);
}

function seq(...items) {
  return tag(0x30, Buffer.concat(items));
}

function set(...items) {
  return tag(0x31, Buffer.concat(items));
}

function integer(num) {
  if (typeof num === "number") {
    if (num < 128) return tag(0x02, Buffer.from([num]));
    const b = [];
    let temp = num;
    while (temp > 0) {
      b.unshift(temp & 0xff);
      temp >>= 8;
    }
    if (b[0] & 0x80) b.unshift(0x00);
    return tag(0x02, Buffer.from(b));
  }
  const buf = Buffer.isBuffer(num) ? num : Buffer.from(num);
  if (buf[0] & 0x80) return tag(0x02, Buffer.concat([Buffer.from([0x00]), buf]));
  return tag(0x02, buf);
}

function oid(str) {
  const parts = str.split(".").map(Number);
  const bytes = [parts[0] * 40 + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let val = parts[i];
    const sub = [];
    sub.push(val & 0x7f);
    while (val >= 128) {
      val >>= 7;
      sub.unshift((val & 0x7f) | 0x80);
    }
    bytes.push(...sub);
  }
  return tag(0x06, Buffer.from(bytes));
}

function bitString(buf) {
  return tag(0x03, Buffer.concat([Buffer.from([0x00]), buf]));
}

function utf8String(str) {
  return tag(0x0c, Buffer.from(str, "utf8"));
}

function utcTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const s =
    pad(d.getUTCFullYear() % 100) +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z";
  return tag(0x17, Buffer.from(s, "ascii"));
}

/**
 * Generates a valid self-signed / automated X.509 v3 certificate with RSA-2048 keypair.
 * Complies with RFC 5280 and modern browser SAN requirements.
 *
 * @param {string} hostname e.g. "api.devpiyush.in"
 * @param {number} validityDays Validity period in days (default 90)
 * @returns {{ certificate: string, privateKey: string, expiresAt: Date }}
 */
function generateCertificate(hostname, validityDays = 90) {
  const safeHostname = String(hostname || "localhost").trim().toLowerCase();

  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + validityDays * 24 * 3600 * 1000);
  const serial = crypto.randomBytes(16);

  // Signature Algorithm: sha256WithRSAEncryption (OID: 1.2.840.113549.1.1.11)
  const sigAlg = seq(oid("1.2.840.113549.1.1.11"), tag(0x05, Buffer.alloc(0)));

  // Distinguished Name (CommonName & Organization)
  const dn = seq(
    set(seq(oid("2.5.4.3"), utf8String(safeHostname))),
    set(seq(oid("2.5.4.10"), utf8String("EchoServer Zero-Config Edge"))),
  );

  const validity = seq(utcTime(now), utcTime(expiresAt));

  // Subject Alternative Names (SAN: OID 2.5.29.17)
  const dnsNames = [safeHostname];
  if (!safeHostname.startsWith("*.") && !safeHostname.includes("localhost") && !safeHostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    dnsNames.push(`*.${safeHostname}`);
  }
  const sanEntries = dnsNames.map((h) => tag(0x82, Buffer.from(h, "ascii")));
  const sanVal = seq(...sanEntries);
  const extensions = tag(
    0xa3,
    seq(seq(oid("2.5.29.17"), tag(0x04, sanVal))),
  );

  // TBS (To Be Signed) Certificate
  const tbs = seq(
    tag(0xa0, integer(2)), // version v3 (0x02)
    integer(serial),
    sigAlg,
    dn, // Issuer
    validity,
    dn, // Subject
    publicKey, // SubjectPublicKeyInfo
    extensions,
  );

  // Sign with RSA-SHA256
  const signer = createSign("SHA256");
  signer.update(tbs);
  const signature = signer.sign(privateKey);

  // Final X.509 Certificate DER & PEM
  const certDer = seq(tbs, sigAlg, bitString(signature));
  const certificate =
    "-----BEGIN CERTIFICATE-----\n" +
    certDer.toString("base64").match(/.{1,64}/g).join("\n") +
    "\n-----END CERTIFICATE-----\n";

  return {
    certificate,
    privateKey,
    expiresAt,
  };
}

module.exports = {
  generateCertificate,
};

