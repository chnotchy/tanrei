// tanrei.config.json as a module. A JSON import (not fs) so that bundlers — the packaged CLI, Theme Studio —
// inline it, and the browser can load the emitter and the invariants.
import config from '../../../tanrei.config.json' with { type: 'json' };

export const CONFIG = config;
