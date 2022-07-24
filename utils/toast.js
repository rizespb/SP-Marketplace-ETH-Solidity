import { toast } from 'react-toastify'

// Промисом будет наша транзакция
export const withToast = (promise) => {
  // Может принимать просто сообщение и объект с конфигами
  // Иди промис. И тогда будет ослеживать состояние промиса
  toast.promise(
    promise,
    // Для состояния pending
    {
      pending: {
        render() {
          return (
            <div className="p-6 py-2">
              <p className="mb-2">Your transaction is being processed.</p>
              <p>Hang tight... Just few more moments.</p>
            </div>
          )
        },
        // Можно выводить иконку перед сообщением, возвращаемым методом render
        icon: false,
      },
      // Для успешно разрешенного промиса
      success: {
        // В метод render будет передан результат выполнения промиса
        render({ data }) {
          return (
            <div>
              <p className="font-bold">Tx: {data.transactionHash.slice(0, 20)}...</p>
              <p>Has been succesfuly processed.</p>

              {/* Ссылка, по которой можно посмотреть состояние транзакции */}
              <a href={`https://ropsten.etherscan.io/tx/${data.transactionHash}`} target="_blank" rel="noreferrer">
                <i className="text-indigo-600 underline">See Tx Details</i>
              </a>
            </div>
          )
        },
        // other options
        icon: '🟢',
      },
      // Для отклоненного промиса
      error: {
        // В метод render будет передан результат отклоненного промиса
        render({ data }) {
          // When the promise reject, data will contains the error
          return <div>{data.message ?? 'Transaction has failed'}</div>
        },
      },
    },
    // В тосте будет кнопка "Закрыть"
    {
      closeButton: true,
    }
  )
}
