// The words a browser test's failure says what was outstanding in (launch.mjs). Nothing here needs a browser, so
// `test/waits.test.mjs` runs it in Node.

/**
 * The requests of a page that had not ended at `now`: each its type, its address, how long ago it was asked and
 * whether its response had come.
 * @param {Iterable<{ type: string, url: string, started: number, answered?: number }>} requests
 * @param {number} now
 */
export function describeRequests(requests, now) {
  const said = [...requests].map(({ type, url, started, answered }) => `${type} ${url}, asked ${((now - started) / 1000).toFixed(1)} s ago, ${answered === undefined ? 'no response' : `response ${answered}, body not ended`}`);
  return said.length ? said.join('; ') : 'no request';
}
