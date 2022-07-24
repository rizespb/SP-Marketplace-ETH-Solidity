import { CourseCard, CourseList } from '@components/ui/course'
import { BaseLayout } from '@components/ui/layout'
import { getAllCourses } from '@content/courses/fetcher'
import { useOwnedCourses, useWalletInfo } from '@components/hooks/web3'
import { Button, Loader } from '@components/ui/common'
import { OrderModal } from '@components/ui/order'
import { useState } from 'react'
import { MarketHeader } from '@components/ui/marketplace'
import { useWeb3 } from '@components/providers'
import { toast } from 'react-toastify'
import { withToast } from '@utils/toast'

const Marketplace = ({ courses }) => {
  const { web3, contract, requireInstall } = useWeb3()

  const { hasConnectedWallet, isConnecting, account } = useWalletInfo()

  // Выбранный курс, для которого открыто модальное окно
  const [selectedCourse, setSelectedCourse] = useState(null)

  // Это курс, для которого сейчас обрабатывается транзакция покупки
  // Чтоб ыотклбчить возможность взаимодействия с ним в этот момент
  // Например, disable кнопки Купить (Purchase)
  const [busyCourseId, setBusyCourseId] = useState(null)

  // Эта переменная будет использоваться в модальном окнею
  // Она говорит о том, первый раз пользователь покупает курс или это повторная покупка после деактивации
  // Если это повторная покупка, то в модальном окне некоторые поля будут скрыты
  const [isNewPurchase, setIsNewPurchase] = useState(true)

  // Все купленные текущим аккаунтом курсы
  const { ownedCourses } = useOwnedCourses(courses, account.data)

  const purchaseCourse = async (order, course) => {
    // Конвертируем CourseId в hex
    const hexCourseId = web3.utils.utf8ToHex(course.id)

    // soliditySha3 - это keccak256
    // soliditySha3 - более сложная версия фукнции sha3 для нескольких параметров с передачей доп параметра type
    const orderHash = web3.utils.soliditySha3(
      {
        type: 'bytes16',
        value: hexCourseId,
      },
      {
        type: 'address',
        value: account.data,
      }
    )

    // Конвертируем ETH (в которых представлена цена курса на сайте) в Wei
    const value = web3.utils.toWei(String(order.price))

    // На время выполнения транзакции покупки отключаем возможность интерактива с курсом (в это время нельзя нажать кнопку купить, чтобы исключить двойные покупки одного курса)
    setBusyCourseId(course.id)

    // Если конкрентно этот курс покупается первый раз, тогда выызваем _purchaseCourse и предаем в транзакцию proof (который содержит в том числе emailHash - данные о пользователе)
    if (isNewPurchase) {
      // sha3 - это keccak256
      // sha3 - это более простая версия функции soliditySha3
      const emailHash = web3.utils.sha3(order.email)

      // Кодируем в keccak orderHash и emailHash
      // Сохраняем в proof, которую надо будет передавать в purchaseCourse в контракте CourseMarketplace
      const proof = web3.utils.soliditySha3({ type: 'bytes32', value: emailHash }, { type: 'bytes32', value: orderHash })

      // _purchaseCourse(hexCourseId, proof, value)
      // Оборачиваем промис в toast. Чтобы выводить уведомления, пока промис выполняется
      withToast(_purchaseCourse({ hexCourseId, proof, value }, course))
    }
    // Если конкрентно этот курс покупается повторно после деактивации, тогда выызваем _repurchaseCourse, для которой нужен только courseHash (orderHash)
    else {
      // _repurchaseCourse(orderHash, value)
      // Оборачиваем промис в toast. Чтобы выводить уведомления, пока промис выполняется
      withToast(_repurchaseCourse({ courseHash: orderHash, value }, course))
    }
  }

  // Функция для покупки курса в первый раз
  const _purchaseCourse = async ({ hexCourseId, proof, value }, course) => {
    try {
      // Фукнции контракта доступны в свойстве methods
      // Используем send, т.к. это транзакия - покупка курса с перечислением денег
      // В send указываем from - от чьего имени транзакция, value - сумму транзакции
      const result = await contract.methods.purchaseCourse(hexCourseId, proof).send({
        from: account.data,
        value,
      })

      // useSwr является в том числе хранилищем данных
      // Если в mutate() ничего не передавать, то повторно выполнится запрос в useSWR
      // А если передать, то переданный аргумент заменит данные, хранимые в useSWR
      // mutate позволяет вручную обновить хранимые в useSwr данные без новых запросов
      // Добавляем в массив ownedCourses.data новый элемент с новым курсом
      // Можно было сделать ownedCourses.mutate(), и тогда бы был совершен новый запрос в useSWR, но мы хотим добавить курс в массив ownedCourses.data немедленно, без ожидания
      ownedCourses.mutate([
        ...ownedCourses.data,
        {
          ...course,
          proof,
          state: 'purchased',
          owner: account.data,
          price: value,
        },
      ])

      // Возвращаем результат транзакции, чтобы эти данные попали в withToast и были переданы в toast, чтобы мы могли в уведомлении использовать данные из транзакции
      return result
    } catch (error) {
      throw new Error(error.message)
    } finally {
      setBusyCourseId(null)
    }
  }

  // Функция для покупки курса повторно после деактивации (т.к. после деактивации деньги покупателю были возвращены0ngfio v )
  const _repurchaseCourse = async ({ courseHash, value }, course) => {
    try {
      // Фукнции контракта доступны в свойстве methods
      // Используем send, т.к. это транзакия - покупка курса с перечислением денег
      // В send указываем from - от чьего имени транзакция, value - сумму транзакции
      const result = await contract.methods.repurchaseCourse(courseHash).send({ from: account.data, value })

      // Если курс покупается повторно, то он уже должен быть в массиве ownedCourses.data
      const index = ownedCourses.data.findIndex((c) => c.id === course.id)

      if (index >= 0) {
        // Меняем статус курса
        ownedCourses.data[index].state = 'purchased'

        // Обновляем информацию, хранимую в useSWR, заменяя ее на ownedCourses.data
        ownedCourses.mutate(ownedCourses.data)

        // Но если курса в массиве ownedCourses.data не нашлось, то вызываем mutate() и это вызовет повторный запрос в useSWR
      } else {
        ownedCourses.mutate()
      }

      // Возвращаем результат транзакции, чтобы эти данные попали в withToast и были переданы в toast, чтобы мы могли в уведомлении использовать данные из транзакции
      return result
    } catch (error) {
      throw new Error(error.message)
    } finally {
      setBusyCourseId(null)
    }
  }

  // Закрытие модалки и очистка стейта
  const cleanupModal = () => {
    setSelectedCourse(null)
    setIsNewPurchase(true)
  }

  return (
    <>
      <MarketHeader />

      <CourseList courses={courses}>
        {(course) => {
          // Проверяем, ходит ли этот курс в число купленных данным аккаунтом
          const owned = ownedCourses.lookup && ownedCourses.lookup[course.id]

          return (
            <CourseCard
              key={course.id}
              course={course}
              state={owned?.state}
              disabled={!hasConnectedWallet}
              Footer={() => {
                if (requireInstall) {
                  return (
                    <Button size="sm" disabled={true} variant="lightPurple">
                      Install
                    </Button>
                  )
                }

                if (isConnecting) {
                  return (
                    <Button size="sm" disabled={true} variant="lightPurple">
                      <Loader size="sm" />
                    </Button>
                  )
                }

                if (!ownedCourses.hasInitialResponse) {
                  return (
                    // <div style={{height: "42px"}}></div>
                    <Button variant="white" disabled={true} size="sm">
                      {hasConnectedWallet ? 'Loading State...' : 'Connect'}
                    </Button>
                  )
                }

                const isBusy = busyCourseId === course.id

                if (owned) {
                  return (
                    <>
                      <div className="flex">
                        <Button size="sm" onClick={() => alert('You are owner of this course.')} disabled={false} variant="white">
                          Yours &#10004;
                        </Button>

                        {/* Эта кнопка для повторной активации
                        Т.к. во время деактивации происходит возврат средств, покупателю надо оплатить курс повторно
                        */}
                        {owned.state === 'deactivated' && (
                          <div className="ml-1">
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => {
                                setIsNewPurchase(false)
                                setSelectedCourse(course)
                              }}
                              variant="purple"
                            >
                              {isBusy ? (
                                <div className="flex">
                                  <Loader size="sm" />
                                  <div className="ml-2">In Progress</div>
                                </div>
                              ) : (
                                <div>Fund to Activate</div>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )
                }

                return (
                  <Button size="sm" onClick={() => setSelectedCourse(course)} disabled={!hasConnectedWallet || isBusy} variant="lightPurple">
                    {isBusy ? (
                      <div className="flex">
                        <Loader size="sm" />
                        <div className="ml-2">In Progress</div>
                      </div>
                    ) : (
                      <div>Purchase</div>
                    )}
                  </Button>
                )
              }}
            />
          )
        }}
      </CourseList>

      {selectedCourse && (
        <OrderModal
          course={selectedCourse}
          isNewPurchase={isNewPurchase}
          onSubmit={(formData, course) => {
            purchaseCourse(formData, course)
            cleanupModal()
          }}
          onClose={cleanupModal}
        />
      )}
    </>
  )
}

Marketplace.Layout = BaseLayout

export default Marketplace

export const getStaticProps = async () => {
  const { data } = getAllCourses()

  return {
    props: {
      courses: data,
    },
  }
}
