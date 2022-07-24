// Страница для АДМИНА для управления курсами

import { BaseLayout } from '@components/ui/layout'
import { MarketHeader, VerificationInput } from '@components/ui/marketplace'
import { CourseFilter, ManagedCourseCard } from '@components/ui/course'
import { Button, Message } from '@components/ui/common'
import { useAdmin, useManagedCourses } from '@components/hooks/web3'
import { useState, useEffect } from 'react'
import { useWeb3 } from '@components/providers'
import { normalizeOwnedCourse } from '@utils/normalize'
import { withToast } from '@utils/toast'

const ManagedCourses = () => {
  // Стейт для сохранения - пройдена ли верификация: конкрентный емейл купил конктретный курс
  const [proofedOwnership, setProofedOwnership] = useState({})

  const { web3, contract } = useWeb3()
  const { account } = useAdmin({ redirectTo: '/marketplace' })
  const { managedCourses } = useManagedCourses(account)

  // Результат поиска курса по Hash в разделе Manage Courses
  const [searchedCourse, setSearchedCourse] = useState(null)

  // Выбранный фильтр поиска
  const [filters, setFilters] = useState({ state: 'all' })

  // Функция верификации получает email пользователя и с помощью хэша курса и proof проверяет, действительно ли пользователь с этим емейлом совершил эту покупку (в контракте мы не храним емейлы покупателей, только адреса аккаунтов и инфу о купленных курсах)
  // proof в pages\marketplace\index.jsx высчитываетс на основе кодирования keccak256 (soliditySha3) хэша курса и хэша емейла
  const verifyCourse = (email, { courseHash, proof }) => {
    if (!email) return

    // sha3 - это keccak256
    const emailHash = web3.utils.sha3(email)

    // soliditySha3 - это keccak256
    // soliditySha3 - более сложная версия фукнции sha3 для нескольких параметров с передачей доп параметра type
    const proofToCheck = web3.utils.soliditySha3(
      {
        type: 'bytes32',
        value: emailHash,
      },
      {
        type: 'bytes32',
        value: courseHash,
      }
    )

    // Если созданный на основе введенного емейла proofToCheck совпадает с хранящимся в контракте proof, значит верификация пройдена
    proofToCheck === proof
      ? setProofedOwnership({
          [courseHash]: true,
        })
      : setProofedOwnership({
          [courseHash]: false,
        })
  }

  // Функция для активации/деактивации купленного курса
  // Вызовет на контракте функцию, переданную в агрументе method
  const changeCourseState = async (courseHash, method) => {
    console.log(courseHash)
    try {
      const result = await contract.methods[method](courseHash).send({
        from: account.data,
      })

      return result
    } catch (e) {
      throw new Error(e.message)
    }
  }

  // Фукнция для активации контракта при клике кнопки Activate
  const activateCourse = async (courseHash) => {
    // changeCourseState(courseHash, "activateCourse")

    // Обрачиваем промис по изменению статуса курса в тоаст для возможности отправки уведомлений
    withToast(changeCourseState(courseHash, 'activateCourse'))
  }

  // Фукнция для деактивации контракта при клике кнопки Activate
  const deactivateCourse = async (courseHash) => {
    // changeCourseState(courseHash, 'deactivateCourse')

    // Обрачиваем промис по изменению статуса курса в тоаст для возможности отправки уведомлений
    withToast(changeCourseState(courseHash, 'deactivateCourse'))
  }

  // Функция для обработки фильтра курсов в разделе Manage Courses
  const searchCourse = async (hash) => {
    // Шаблон для проверки, является ли строка hex
    // Просто взяли из гугла на курсе
    const re = /[0-9A-Fa-f]{6}/g

    // Проверяем, что хэш передан, его длина 66 и что переданный хэш является
    // Например, 0xc61001e082b6852e20f8b6dcad6b51f510b10fc1cf8a68b0b3a4601b0711ebcd
    if (hash && hash.length === 66 && re.test(hash)) {
      // Получаем кус из контракта
      const course = await contract.methods.getCourseByHash(hash).call()

      // Если курс существует, помещаем его в searchedCourse
      if (course.owner !== '0x0000000000000000000000000000000000000000') {
        const normalized = normalizeOwnedCourse(web3)({ hash }, course)
        setSearchedCourse(normalized)
        return
      }
    }

    setSearchedCourse(null)
  }

  // Карточка одного курса. Не стали выносить в отдельный компонент
  // isSearched флаг, на основании которого в ManagedCourseCard карточка будет обведена в синию границу
  const renderCard = (course, isSearched) => {
    return (
      <ManagedCourseCard key={course.ownedCourseId} isSearched={isSearched} course={course}>
        <VerificationInput
          onVerifyClick={(email) => {
            verifyCourse(email, {
              courseHash: course.hash,
              proof: course.proof,
            })
          }}
        />

        {proofedOwnership[course.hash] && (
          <div className="mt-2">
            <Message>Verified!</Message>
          </div>
        )}

        {proofedOwnership[course.hash] === false && (
          <div className="mt-2">
            <Message type="danger">Wrong Proof!</Message>
          </div>
        )}

        {course.state === 'purchased' && (
          <div className="mt-2">
            <Button onClick={() => activateCourse(course.hash)} variant="green">
              Activate
            </Button>
            <Button onClick={() => deactivateCourse(course.hash)} variant="red">
              Deactivate
            </Button>
          </div>
        )}
      </ManagedCourseCard>
    )
  }

  // @TODO
  useEffect(() => {
    console.log(filters)
  }, [filters])

  if (!account.isAdmin) return null

  // Отфильтровываем курсы и сразу маппим их в массив ReactElemet renderCard
  const filteredCourses = managedCourses.data
    ?.filter((course) => {
      // Если фильтр "выводить все курсы", то на все курсы колбэк вернет true
      if (filters.state === 'all') {
        return true
      }

      return course.state === filters.state
    })
    .map((course) => renderCard(course))

  return (
    <>
      <MarketHeader />

      {/* onFilterSelect устанавливает в стейт выбранный фильтр*/}
      <CourseFilter onFilterSelect={(value) => setFilters({ state: value })} onSearchSubmit={searchCourse} />

      <section className="grip grid-cols-1">
        {/* Вначале отрисовываем результаты поиска, если они есть */}
        {searchedCourse && (
          <div>
            <h1 className="text-2xl font-bold p-5">Search</h1>
            {renderCard(searchedCourse, true)}
          </div>
        )}

        {/* Потом отрисовываем все курсы отдельным списком */}
        <h1 className="text-2xl font-bold p-5">All Courses</h1>
        {/* Ренедерим отфильтрованные курсы (или все, если статус all) */}
        {filteredCourses}

        {/* Если в отфильтрованных курсах ничего нет, тогда рендерим сообщение */}
        {filteredCourses?.length === 0 && <Message type="warning">No courses to display</Message>}
      </section>
    </>
  )
}

ManagedCourses.Layout = BaseLayout

export default ManagedCourses
