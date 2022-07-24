import { createCourseHash } from '@utils/hash'
import { normalizeOwnedCourse } from '@utils/normalize'
import useSWR from 'swr'

// Получить инфу о всех курсах, купленных текущим аккаунтом
// courses - это все курсы, которые существуют в нашем магазине и продаются на странице marketplace
export const handler = (web3, contract) => (courses, account) => {
  const swrResponse = useSWR(
    // Передавая account, мы при смене аккаунта будем возвращать из условия новое истинное значение, отличное от предыдущего истинного значения
    // И функция-fetcher будет выполняться заново
    () => (web3 && contract && account ? `web3/ownedCourses/${account}` : null),
    async () => {
      const ownedCourses = []

      // Проходимся по массиву всех курсов
      // Высчитываем хэш курса на основе id курса и адреса текущего аккаунта
      // Проверяем, есть ли такой хэш и значение по этому хэшу в mapping купленных курсов в контракте
      for (let i = 0; i < courses.length; i++) {
        const course = courses[i]

        if (!course.id) continue

        // Получение хэша курса на основании id курса в Hex-формате и адреса аккаунта
        const courseHash = createCourseHash(web3)(course.id, account)

        // Вызываем фукнцию контракта getCourseByHash, чтобы получить курс по
        // Используем бесплатный метод call, т.к. это не транзакция, а бесплатный вызов
        // Мы запрашиваем курс с хэшем в массиве купленных курсов
        // А потом проверяем, есть ли такой курс или вернулся 0
        // Мы получим курс именно текущего аккаунта, т.к. courseHash строиться на основе id курса и адреса аккаунта, который его купил
        const ownedCourse = await contract.methods.getCourseByHash(courseHash).call()

        // Если адрес не равен нулевому адресу, значит в ownedCourse есть данные. Значит он был куплен текущим аккаунтом
        if (ownedCourse.owner !== '0x0000000000000000000000000000000000000000') {
          // Нормализуем полученные данные ownedCourse (приведем к удобному виду)
          const normalized = normalizeOwnedCourse(web3)(course, ownedCourse)

          ownedCourses.push(normalized)
        }
      }

      return ownedCourses
    }
  )

  // lookup - это карта (словарь), в котором по ключу (id) сохраняем курс, чтобы потом со сложностью O(1) проверять по id, есть ли какой-то курс в числе купленных данным аккаунтом
  return {
    ...swrResponse,
    lookup: swrResponse.data?.reduce((acc, course) => {
      acc[course.id] = course
      return acc
    }, {}),
  }
}
