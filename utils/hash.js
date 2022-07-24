// Получение хэша курса на основании id курса в Hex-формате и адреса аккаунта
export const createCourseHash = (web3) => (courseId, account) => {
  // Кодируем id курса в Hex
  const hexCourseId = web3.utils.utf8ToHex(courseId)

  // soliditySha3 - это keccak256
  // Получаем хэш курса
  const courseHash = web3.utils.soliditySha3(
    {
      type: 'bytes16',
      value: hexCourseId,
    },
    {
      type: 'address',
      value: account,
    }
  )

  return courseHash
}
