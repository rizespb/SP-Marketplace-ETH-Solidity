import { useHooks, useWeb3 } from '@components/providers/web3'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

// Немного сложная структура из нескольких файлов и методов для того, чтобы просто в контекст Web3Context прокинутьь все создаваемые кастомные хуки, связанные с web3

// Хелпер для проверки, пришли пустая data или в ней есть информация
const _isEmpty = (data) => {
  return data == null || data == '' || (Array.isArray(data) && data.length === 0) || (data.constructor === Object && Object.keys(data).length === 0)
}

// Утилита enhanceHook служит для того, чтобы добавить в любой хук, использующий useSWR, свойтсво hasInitialResponse - для ослеживания статуса запроса. Похоже на статус laoding в других хуках
const enhanceHook = (swrResponse) => {
  const { data, error } = swrResponse

  const hasInitialResponse = !!(data || error)
  const isEmpty = hasInitialResponse && _isEmpty(data)

  return {
    ...swrResponse,
    isEmpty,
    hasInitialResponse,
  }
}

export const useNetwork = () => {
  const swrResponse = enhanceHook(useHooks((hooks) => hooks.useNetwork)())

  return {
    network: swrResponse,
  }
}

export const useAccount = () => {
  const swrResponse = enhanceHook(useHooks((hooks) => hooks.useAccount)())

  return {
    account: swrResponse,
  }
}

// Хук перенаправляет на другую страницу, если пользователь не админ или Метамаск не устанволен (для раздела Manage Courses)
export const useAdmin = ({ redirectTo }) => {
  const { account } = useAccount()
  const router = useRouter()
  const { requireInstall } = useWeb3()

  useEffect(() => {
    if (requireInstall || (account.hasInitialResponse && !account.isAdmin) || account.isEmpty) router.push(redirectTo)
  }, [account])

  return { account }
}

// Получить инфу о всех курсах, купленных текущим аккаунтом
export const useOwnedCourses = (...args) => {
  const swrResponse = enhanceHook(useHooks((hooks) => hooks.useOwnedCourses)(...args))

  return {
    ownedCourses: swrResponse,
  }
}

// Получить информацию о курсе из контракта, если курс был ранее куплен текущим аккаунтом
export const useOwnedCourse = (...args) => {
  const swrResponse = enhanceHook(useHooks((hooks) => hooks.useOwnedCourse)(...args))

  return {
    ownedCourse: swrResponse,
  }
}

//
export const useManagedCourses = (...args) => {
  const swrResponse = enhanceHook(useHooks((hooks) => hooks.useManagedCourses)(...args))

  return {
    managedCourses: swrResponse,
  }
}

// Этот хук просто объединяет информацию из хуков useAccount и useNetwork
// И добавляет новое свойство canPurchaseCourse - можно ли купить курс
// true, если пользователь авторизован и мы подключены к нужной сети
export const useWalletInfo = () => {
  const { account } = useAccount()
  const { network } = useNetwork()

  const isConnecting = !account.hasInitialResponse && !network.hasInitialResponse

  const hasConnectedWallet = !!(account.data && network.isSupported)

  return {
    account,
    network,
    isConnecting,
    hasConnectedWallet,
  }
}
