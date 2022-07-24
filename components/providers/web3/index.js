import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import detectEthereumProvider from '@metamask/detect-provider'
import Web3 from 'web3'
import { setupHooks } from './hooks/setupHooks'
import { loadContract } from '@utils/loadContracts'

const Web3Context = createContext(null)

// хелпер, который вешает обработчик на изменение chainId (смену используемой сети) и перезагружает страницу
const setListeners = (provider) => {
  provider.on('chainChanged', (_) => window.location.reload())
}

// Это просто хелпер для более красивой организации кода
const createWeb3State = ({ web3, provider, contract, isLoading }) => {
  return {
    web3,
    provider,
    contract,
    isLoading,
    hooks: setupHooks({ web3, provider, contract }),
  }
}

const Web3Provider = ({ children }) => {
  const [web3Api, setWeb3Api] = useState(
    createWeb3State({
      web3: null,
      provider: null,
      contract: null,
      isLoading: true,
    })
  )

  // Получаемый Эфириум-провайдер, который предоставляет в браузере расширение Metamask
  // На его основе создаем сущеность web3 для дальнейшего взаимодействия с сетью Эфириум
  useEffect(() => {
    const loadProvider = async () => {
      const provider = await detectEthereumProvider()

      if (provider) {
        const web3 = new Web3(provider)

        // Указываем имя скомпилированного контракта (после truffle сcompile) из папки public/contracts
        const contract = await loadContract('CourseMarketplace', web3)

        // Вешаем обработчик на изменение chainId (смену используемой сети), в случае чего перезагружаем страницу
        setListeners(provider)

        setWeb3Api(
          createWeb3State({
            web3,
            provider,
            contract,
            isLoading: false,
          })
        )
      } else {
        setWeb3Api((prev) => ({ ...prev, isLoading: false }))

        console.error('Please, install Metamask')
      }
    }

    loadProvider()
  }, [])

  // Добавляем к web3Api фукнцию connect для подключения к аккаунту Метамаск
  const _web3Api = useMemo(() => {
    const { web3, provider, isLoading } = web3Api

    return {
      ...web3Api,
      requireInstall: !isLoading && !web3,
      connect: provider
        ? async () => {
            try {
              // Будет открыт Метамаск и отобразиться запрос авторизации
              await provider.request({ method: 'eth_requestAccounts' })
            } catch {
              console.error('Cannot retreive account')
              // По-моему, это лишнее
              location.reload()
            }
          }
        : () => console.error('Cannot connect to MetaMask, try to reload your browser please'),
    }
  }, [web3Api])

  return <Web3Context.Provider value={_web3Api}>{children}</Web3Context.Provider>
}

export default Web3Provider

// Хук для получения значение из контекста Web3Context
export const useWeb3 = () => useContext(Web3Context)

export const useHooks = (callback) => {
  const { hooks } = useWeb3()

  return callback(hooks)
}
