import { createCourseHash } from '@utils/hash'
import { normalizeOwnedCourse } from '@utils/normalize'
import useSWR from 'swr'

// Получить информацию о курсе из контракта, если курс был ранее куплен текущим аккаунтом
export const handler = (web3, contract) => (course, account) => {
  const swrResponse = useSWR(
    // Передавая account, мы при смене аккаунта будем возвращать из условия новое истинное значение, отличное от предыдущего истинного значения
    // И функция-fetcher будет выполняться заново
    () => (web3 && contract && account ? `web3/ownedCourses/${account}` : null),
    async () => {
      // Получение хэша курса на основании id курса в Hex-формате и адреса аккаунта
      const courseHash = createCourseHash(web3)(course.id, account)

      // Вызываем фукнцию контракта getCourseByHash, чтобы получить курс по
      // Используем бесплатный метод call, т.к. это не транзакция, а бесплатный вызов
      // Мы запрашиваем курс с хэшем в массиве купленных курсов
      // А потом проверяем, есть ли такой курс или вернулся 0
      // Мы получим курс именно текущего аккаунта, т.к. courseHash строиться на основе id курса и адреса аккаунта, который его купил
      const ownedCourse = await contract.methods.getCourseByHash(courseHash).call()

      // Если адрес равен нулевому адресу, значит этого курса в купленных данным аккаунтом курсах нет
      if (ownedCourse.owner === '0x0000000000000000000000000000000000000000') {
        return null
      }

      return normalizeOwnedCourse(web3)(course, ownedCourse)
    }
  )

  return swrResponse
}
