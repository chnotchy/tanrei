// What the active system does not have: `@tanrei/web/availability` is the two functions alone, without defining an
// element. A component, or a value of its `variant`, that the system leaves out — or that lives in a layer the system
// does not extend — still works; a debug build reports each use, and records it:
// `setAvailabilityMode('error')` reports it as an error, and `unavailableUses()` lists what was used.
export { type AvailabilityMode, setAvailabilityMode, unavailableUses } from './primitives/availability.js';
