import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'

const ActiveLink = ({ children, activeLinkClass, ...props }) => {
  const { pathname } = useRouter()

  // Вытаскиваем занчение пропа className из переданных чилдренов (если передано)
  let className = children.props.className || ''

  if (pathname === props.href) {
    className = `${className} ${activeLinkClass ? activeLinkClass : '!text-indigo-600'}`
  }

  return (
    <Link {...props}>
      {
        // Создает копию элемента. cloneElement позволяет прокинуть дополнительные пропсы
        // Второй параметр - дополнительные пропсы, которые надо прокинуть в новый элемент
        React.cloneElement(children, { className })
      }
    </Link>
  )
}

export default ActiveLink
