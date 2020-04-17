/**
 * The possible states:
 * * CREATED
 * * AVAILABLE
 * * RETURNED
 * * VALIDATING
 * * BORROWED
 * * INVALID
 * * DESTROYED
 *  @typedef { "CREATED" | "AVAILABLE" | "RETURNED" | "VALIDATING" | "BORROWED" | "INVALID" | "DESTROYED" } ObjectState
 *  @alias ObjectState
 *  @memberof PooledObject
 */

/**
 * @type {Object<number,ObjectState>|Object<ObjectState,number>}
 * @private
 */
const ObjectStates = {
  CREATED: 0,
  AVAILABLE: 1,
  RETURNED: 2,
  VALIDATING: 3,
  BORROWED: 4,
  INVALID: 5,
  DESTROYED: 6,
};

// adds state key to object to make it easier to get state string from state
Object.entries(ObjectStates).forEach(([key, state]) => (ObjectStates[state] = key));

module.exports = ObjectStates;
