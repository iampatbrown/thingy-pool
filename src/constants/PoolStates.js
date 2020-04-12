/**
 * @typedef {'CREATED'|'STARTING'|'STARTED'|'SHUTTING_DOWN'|'STOPPED'} PoolState
 */

const PoolStates = {
  CREATED: 0,
  STARTING: 1,
  STARTED: 2,
  SHUTTING_DOWN: 3,
  STOPPED: 4,
};

module.exports = PoolStates;
