// No test of this module may touch the real network. Every test file imports this first: it replaces the platform's
// name resolution for the whole process with one that answers nothing and writes down that it was asked. A test that
// reaches the fetcher gives it a seam (server.mjs) whose `resolve` is its own and whose `route` leads to 127.0.0.1.
import dns from 'node:dns';

/** Every name the platform's resolver was asked for. Empty at the end of a run that kept to its seam. */
export const asked = [];
/** What the platform's resolver answers in this process: nothing, unless a test sets it. */
export const platform = { answer: null };

const refuse = (host) => {
  asked.push(host);
  const error = new Error(`the tests do not resolve names (${host})`);
  error.code = 'ENOTFOUND';
  return error;
};
dns.promises.lookup = async (host) => {
  if (platform.answer) return (asked.push(host), platform.answer);
  throw refuse(host);
};
dns.lookup = (host, options, callback) => {
  const done = typeof options === 'function' ? options : callback;
  // The tests' own server listens on the machine itself, and the platform asks for that address by this function.
  if (host === '127.0.0.1') process.nextTick(() => (options?.all ? done(null, [{ address: host, family: 4 }]) : done(null, host, 4)));
  else process.nextTick(() => done(refuse(host)));
};
