import 'react-toastify/dist/ReactToastify.css'
import '@styles/globals.css'
import { ToastContainer } from 'react-toastify'

const Noop = ({ children }) => <>{children}</>

function MyApp({ Component, pageProps }) {
  // Если Layout в компоненте страницы не определен, тогда будет использоваться Noop, который просто прокинет children внутрь
  const Layout = Component.Layout ?? Noop

  return (
    <Layout>
      <ToastContainer/>
      <Component {...pageProps} />
    </Layout>
  )
}

export default MyApp
