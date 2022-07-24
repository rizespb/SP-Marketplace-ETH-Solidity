import { useEffect } from 'react'
import useSWR from 'swr'

// Значение chainId Для разных сетей
// Взято из https://docs.metamask.io/guide/ethereum-provider.html#chain-ids
const NETWORKS = {
  1: 'Ethereum Main Network',
  3: 'Ropsten Test Network',
  4: 'Rinkeby Test Network',
  5: 'Goerli Test Network',
  42: 'Kovan Test Network',
  56: 'Binance Smart Chain',
  1337: 'Ganache',
}

const targetNetwork = NETWORKS[process.env.NEXT_PUBLIC_TARGET_CHAIN_ID]

// Внимание: handler возвращает фукнцию, которая благодаря замыканию будет иметь доступ к переданным аргументам - web3 и provider
export const handler = (web3) => () => {
  // Получаем Chain ID
  // Первый параметр - идентификатор, который, передается в fetcher автоматически (в данном примере не применяем это). Обычно это url для запроса. Если null, то fetcher вызван не будет
  const { data, ...rest } = useSWR(web3 ? 'web3/network' : null, async () => {
    const chainId = await web3.eth.getChainId()

    if (!chainId) throw new Error('Cannot retreive network. Please refresh the browser.')

    return NETWORKS[chainId]
  })

  // По-моему, этот обработчик избыточен. Т.к. при изменении сети меняется контекст (web3 и provider). Компонент переисовывается и заново отрабатывает хук useSWR() выше
  // useEffect(() => {
  //   // Навешиваем обработчик. При изменении chainId  будут изменяться данные, хранимые в SWR на новый chainId который будет передаваться в коллбэк в 16-ном формате (поэтому parseInt)
  //   // const mutator = (chainId) => mutate(NETWORKS[parseInt(chainId, 16)])
  //   const mutator = (chainId) => window.location.reload()

  //   provider?.on('chainChanged', mutator)

  //   return () => {
  //     provider?.removeListener('chainChanged', mutator)
  //   }
  // }, [provider])

  return {
    data,
    target: targetNetwork,
    isSupported: data === targetNetwork,
    ...rest,
  }
}
