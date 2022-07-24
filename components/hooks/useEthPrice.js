import useSWR from 'swr'

const URL =
  'https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false'

// Хардкодим стоимость каждого курса 15$
export const COURSE_PRICE = 15

const fetcher = async (url) => {
  const res = await fetch(url)
  const json = await res.json()

  // Вытаскиваем из ответа текущую стоимость Ether в $
  return json.market_data.current_price.usd ?? null
}

// URL будет автоматически передан в fetcher
// Третий параметр в useSWR - это объект options
export const useEthPrice = () => {
  const { data, ...rest } = useSWR(URL, fetcher, {
    refreshInterval: 10000,
  })

  // Получаем стоимость курса в ETH при фиксированной  стоимости в долларах - 15$ за курс
  const perItem = (data && (COURSE_PRICE / data).toFixed(6)) ?? null

  return { eth: { data, perItem, ...rest } }
}
