const { setupForTests, setupForTestsAsync } = require('./helpers');

describe('PoolEvents', () => {
  describe('poolDidStart', () => {
    it('should trigger after the pool has started', async () => {
      expect.assertions(1);
      const { pool, callback } = setupForTests({ shouldAutoStart: false });
      pool.on('poolDidStart', callback);
      await pool.start();
      expect(callback).toBeCalledTimes(1);
    });

    it('should only trigger once if start called multiple times', async () => {
      expect.assertions(1);
      const { pool, callback } = setupForTests({ shouldAutoStart: false });
      pool.on('poolDidStart', callback);
      await pool.start();
      await pool.start();
      expect(callback).toBeCalledTimes(1);
    });
  });

  describe('poolDidStop', () => {
    it('should trigger after the pool has stopped', async () => {
      expect.assertions(1);
      const { pool, callback } = await setupForTestsAsync({ shouldAutoStart: true });
      pool.on('poolDidStop', callback);
      await pool.stop();
      expect(callback).toBeCalledTimes(1);
    });

    it('should only trigger once if stop called multiple times', async () => {
      expect.assertions(1);
      const { pool, callback } = await setupForTestsAsync({ shouldAutoStart: true });
      pool.on('poolDidStop', callback);
      await pool.stop();
      await pool.stop();
      expect(callback).toBeCalledTimes(1);
    });
  });

  describe('factoryCreateError', () => {
    it('should trigger if factory throws an error while creating an object', async () => {
      expect.assertions(1);
      const { pool, factoryCreate, callback } = await setupForTestsAsync();
      factoryCreate.mockRejectedValueOnce();
      pool.on('factoryCreateError', callback);
      await pool.acquire();
      expect(callback).toBeCalledTimes(1);
    });

    it('should trigger for each error', async () => {
      expect.assertions(1);
      const { pool, factoryCreate, callback } = await setupForTestsAsync();
      factoryCreate.mockRejectedValueOnce().mockRejectedValueOnce();
      pool.on('factoryCreateError', callback);
      await pool.acquire();
      expect(callback).toBeCalledTimes(2);
    });

    it('should forward the factory error as the event parameter', async () => {
      expect.assertions(2);
      const { pool, factoryCreate, callback } = await setupForTestsAsync();
      const errors = [new Error(), new Error()];

      factoryCreate.mockRejectedValueOnce(errors[0]).mockRejectedValueOnce(errors[1]);
      pool.on('factoryCreateError', callback);
      await pool.acquire();
      expect(callback).nthCalledWith(1, errors[0]);
      expect(callback).nthCalledWith(2, errors[1]);
    });
  });

  describe('factoryValidateError', () => {
    describe('when validating object on dispatch', () => {
      it('should trigger if factory throws an error', async () => {
        expect.assertions(1);
        const { pool, factoryValidate, callback } = await setupForTestsAsync({ shouldValidateOnDispatch: true });
        factoryValidate.mockRejectedValueOnce();
        pool.on('factoryValidateError', callback);
        await pool.acquire();
        expect(callback).toBeCalledTimes(1);
      });

      it('should trigger for each error', async () => {
        expect.assertions(1);
        const { pool, factoryValidate, callback } = await setupForTestsAsync({ shouldValidateOnDispatch: true });
        factoryValidate.mockRejectedValueOnce().mockRejectedValueOnce();
        pool.on('factoryValidateError', callback);
        await pool.acquire();
        expect(callback).toBeCalledTimes(2);
      });

      it('should forward the factory error as the event parameter', async () => {
        expect.assertions(2);
        const { pool, factoryValidate, callback } = await setupForTestsAsync({ shouldValidateOnDispatch: true });
        const errors = [new Error(), new Error()];
        factoryValidate.mockRejectedValueOnce(errors[0]).mockRejectedValueOnce(errors[1]);
        pool.on('factoryValidateError', callback);
        await pool.acquire();
        expect(callback).nthCalledWith(1, errors[0]);
        expect(callback).nthCalledWith(2, errors[1]);
      });
    });

    describe('when validating object on return', () => {
      it('should trigger if factory throws an error while validating', async () => {
        expect.assertions(1);
        const { pool, factoryValidate, callback } = await setupForTestsAsync({ shouldValidateOnReturn: true });
        factoryValidate.mockRejectedValueOnce();
        pool.on('factoryValidateError', callback);
        const object = await pool.acquire();
        await pool.release(object);
        expect(callback).toBeCalledTimes(1);
      });

      it('should trigger for each error', async () => {
        expect.assertions(1);
        const { pool, factoryValidate, callback } = await setupForTestsAsync({ shouldValidateOnReturn: true });
        factoryValidate.mockRejectedValueOnce().mockRejectedValueOnce();
        pool.on('factoryValidateError', callback);
        const objects = await Promise.all([pool.acquire(), pool.acquire()]);
        await Promise.all(objects.map(object => pool.release(object)));
        expect(callback).toBeCalledTimes(2);
      });

      it('should forward the factory error as the event parameter', async () => {
        expect.assertions(2);
        const { pool, factoryValidate, callback } = await setupForTestsAsync({ shouldValidateOnReturn: true });
        const errors = [new Error(), new Error()];
        factoryValidate.mockRejectedValueOnce(errors[0]).mockRejectedValueOnce(errors[1]);
        pool.on('factoryValidateError', callback);
        const objects = await Promise.all([pool.acquire(), pool.acquire()]);
        await Promise.all(objects.map(object => pool.release(object)));
        expect(callback).nthCalledWith(1, errors[0]);
        expect(callback).nthCalledWith(2, errors[1]);
      });
    });
  });

  describe('factoryDestroyError', () => {
    it('should trigger if factory throws an error while destroying an object', async () => {
      expect.assertions(1);
      const { pool, factoryDestroy, callback } = await setupForTestsAsync();
      factoryDestroy.mockRejectedValueOnce();
      pool.on('factoryDestroyError', callback);
      const object = await pool.acquire();
      await pool.releaseAndDestroy(object);
      expect(callback).toBeCalledTimes(1);
    });

    it('should trigger for each error', async () => {
      expect.assertions(1);
      const { pool, factoryDestroy, callback } = await setupForTestsAsync({ shouldValidateOnReturn: true });
      factoryDestroy.mockRejectedValueOnce().mockRejectedValueOnce();
      pool.on('factoryDestroyError', callback);
      const objects = await Promise.all([pool.acquire(), pool.acquire()]);
      await Promise.all(objects.map(object => pool.releaseAndDestroy(object)));
      expect(callback).toBeCalledTimes(2);
    });

    it('should forward the factory error as the event parameter', async () => {
      expect.assertions(2);
      const { pool, factoryDestroy, callback } = await setupForTestsAsync({ shouldValidateOnReturn: true });
      const errors = [new Error(), new Error()];
      factoryDestroy.mockRejectedValueOnce(errors[0]).mockRejectedValueOnce(errors[1]);
      pool.on('factoryDestroyError', callback);
      const objects = await Promise.all([pool.acquire(), pool.acquire()]);
      await Promise.all(objects.map(object => pool.releaseAndDestroy(object)));
      expect(callback).nthCalledWith(1, errors[0]);
      expect(callback).nthCalledWith(2, errors[1]);
    });
  });
});
