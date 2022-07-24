import { normalizeOwnedCourse } from '@utils/normalize'
import useSWR from 'swr'

// Получает инфу для админа обо все купленных всеми юзерами курсах
// Отличие от useOwnedCourses в том, что useOwnedCoursesполучает инфу для пользователя только о курсах, купленных именно этим пользователем
export const handler = (web3, contract) => (account) => {
  const swrResponse = useSWR(
    // Передавая account, мы при смене аккаунта будем возвращать из условия новое истинное значение, отличное от предыдущего истинного значения
    // И функция-fetcher будет выполняться заново
    () => (web3 && contract && account.data && account.isAdmin ? `web3/managedCourses/${account.data}` : null),
    async () => {
      const courses = []

      // Т.к. это только чтение информации,  используем call (для отправки транзакции надо использовать send)
      // getCourseCount - вернет totalOwnedCourses - общее количество купленных курсов
      const courseCount = await contract.methods.getCourseCount().call()

      for (let i = Number(courseCount) - 1; i >= 0; i--) {
        // Получаем хэш каждой покупки (каждого купленного курса) из ownedCourseHash в контракте
        const courseHash = await contract.methods.getCourseHashAtIndex(i).call()

        // По хэшу получаем данные о каждом купленном курсе (что за курс, покупатеь и т.д.) по хэшу курса
        const course = await contract.methods.getCourseByHash(courseHash).call()

        if (course) {
          // Как администратора курсов нас интересует только инфа о курсе из контракта и хэш курса, поэтому первым параметром передаем не курс целиком (оригинальный курс, который прихошел ранее с бэка и продается на странице marketplace), а вместо него объект с хэшем курса
          const normalized = normalizeOwnedCourse(web3)({ hash: courseHash }, course)

          courses.push(normalized)
        }
      }

      return courses
    }
  )

  return swrResponse
}
