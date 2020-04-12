/**
 * @typedef {'CREATED'|'AVAILABLE'|'RETURNED'|'VALIDATING'|'BORROWED'|'INVALID'|'DESTROYED'} ObjectState
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

module.exports = ObjectStates;
