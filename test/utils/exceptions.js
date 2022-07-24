// Утилита для тестирования ошибок
const PREFIX = 'Returned error: VM Exception while processing transaction: '

// Функция tryCatch будет выполнять промис и отлавливать ошибки. И сравнивать соответствие сообщения из ошибки с переданным в виде второго параметра message
async function tryCatch(promise, message) {
  try {
    await promise
    throw null
  } catch (error) {
    assert(error, 'Expected an error but did not get one')
    assert(error.message.startsWith(PREFIX + message), "Expected an error starting with '" + PREFIX + message + "' but got '" + error.message + "' instead")
  }
}

// Экспортируем объект с методами, в которых определены тесты ошибок, с кторыми будут заершаться тесты в случае соответствующих ошибок
module.exports = {
  catchRevert: async function (promise) {
    await tryCatch(promise, 'revert')
  },
  catchOutOfGas: async function (promise) {
    await tryCatch(promise, 'out of gas')
  },
  catchInvalidJump: async function (promise) {
    await tryCatch(promise, 'invalid JUMP')
  },
  catchInvalidOpcode: async function (promise) {
    await tryCatch(promise, 'invalid opcode')
  },
  catchStackOverflow: async function (promise) {
    await tryCatch(promise, 'stack overflow')
  },
  catchStackUnderflow: async function (promise) {
    await tryCatch(promise, 'stack underflow')
  },
  catchStaticStateChange: async function (promise) {
    await tryCatch(promise, 'static state change')
  },
}
