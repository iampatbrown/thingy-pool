// should we change state STARTED to RUNNING? not too fussed...
/**
 * The possible states:
 * * CREATED
 * * STARTING
 * * STARTED
 * * SHUTTING_DOWN
 * * STOPPED
 *  @typedef { "CREATED" | "STARTING" | "STARTED" | "SHUTTING_DOWN" | "STOPPED" } PoolState
 *  @alias PoolState
 *  @memberof Pool
 */

/**
 * @type {Object<number,PoolState>|Object<PoolState,number>}
 * @private
 */
const PoolStates = {
  CREATED: 0,
  STARTING: 1,
  STARTED: 2,
  SHUTTING_DOWN: 3,
  STOPPED: 4,
};

// adds state key to object to make it easier to get state string from state
Object.entries(PoolStates).forEach(([key, state]) => (PoolStates[state] = key));

module.exports = PoolStates;
