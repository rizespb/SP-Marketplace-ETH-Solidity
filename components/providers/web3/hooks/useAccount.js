// Немного сложная структура из нескольких файлов и методов для того,
// чтобы просто в контекст Web3Context прокинутьь все создаваемые кастомные хуки, связанные с web3

import { useEffect } from 'react'
import useSWR from 'swr'

// Для безопасности (чтобы нельзя было узнать адресс аккаунта админа) можно пропускать адрес через keccak256 (кодировать адрес без 0x в HEX (не текст) в hash)
const adminAddress = {
  // '0xA4C02b302d69Db76EEef38e2BA732022F6E08b02': true,
  '0x1a07a0c56721ab0926a423b7db0c7fb596eda8bec00dece39840dfb4de4cc128': true,
}

// Внимание: handler возвращает фукнцию, которая благодаря замыканию будет иметь доступ к переданным аргументам - web3 и provider
export const handler = (web3, provider) => () => {
  // Здесь хранится текущий аккаунт Метамаск
  // Первый параметр - идентификатор, который передается в fetcher автоматически при необходимости (в данном примере не применяем это). Обычно это url для запроса. Если false, то fetcher вызван не будет
  // Второй параметр - fetcher - функция, для получения данных
  // mutate - метод, для изменения полученных данных
  // Если в mutate() ничего не передавать, то повторно выполнится запрос в useSWR
  // А если передать, то переданный аргумент заменит данные, хранимые в useSWR
  const { data, mutate, ...rest } = useSWR(web3 ? 'web3/accounts' : null, async () => {
    const accounts = await web3.eth.getAccounts()
    const account = accounts[0]

    if (!account) throw new Error('Cannot retreive an account. Please refresh the browser.')

    return account
  })

  // Вешаем слушатель на изменение аккаунта в расширении Метамаск
  useEffect(() => {
    // window.ethereum && window.ethereum.on('accountsChanged', (accounts) => setAccount(accounts[0] ?? null))

    // Если в mutate() ничего не передавать, то повторно выполнится запрос в useSWR
    // А если передать, то переданный аргумент заменит данные, хранимые в useSWR
    // Мы вручную обновляем данные, хранимые в useSwr на accounts[0] ?? null при изменении провайдера
    const mutator = (accounts) => mutate(accounts[0] ?? null)

    provider?.on('accountsChanged', mutator)

    return () => {
      provider?.removeListener('accountsChanged', mutator)
    }
  }, [provider, mutate])

  return {
    data,
    isAdmin: (data && adminAddress[web3.utils.keccak256(data)]) ?? false,
    mutate,
    ...rest,
  }
}
