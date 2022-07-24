// Страница МОИ КУРСЫ

// Страница для АДМИНА для управления курсами

import { BaseLayout } from '@components/ui/layout'
import { MarketHeader } from '@components/ui/marketplace'
import { OwnedCourseCard } from '@components/ui/course'
import { Button, Message } from '@components/ui/common'
import { useAccount, useOwnedCourses } from '@components/hooks/web3'
import { getAllCourses } from '@content/courses/fetcher'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useWeb3 } from '@components/providers'

const OwnedCourses = ({ courses }) => {
  const router = useRouter()

  const { requireInstall } = useWeb3()

  const { account } = useAccount()

  // Все купленные текущим аккаунтом курсы
  const { ownedCourses } = useOwnedCourses(courses, account.data)

  return (
    <>
      <MarketHeader />

      <section className="grip grid-cols-1">
        {ownedCourses.isEmpty && (
          <div className="w-1/2">
            <Message type="warning">
              <div>You don&apos;t own any courses</div>
              <Link href="/marketplace">
                <a className="font-normal hover:underline">
                  <i>Purchased course</i>
                </a>
              </Link>
            </Message>
          </div>
        )}

        {account.isEmpty && (
          <div className="w-1/2">
            <Message type="warning">
              <div>Please connect to Metamask</div>
            </Message>
          </div>
        )}

        {requireInstall && (
          <div className="w-1/2">
            <Message type="warning">
              <div>Please install Metamask</div>
            </Message>
          </div>
        )}

        {ownedCourses.data?.map((course) => (
          <OwnedCourseCard key={course.id} course={course}>
            <Button onClick={() => router.push(`/courses/${course.slug}`)}>Watch the course</Button>
          </OwnedCourseCard>
        ))}
      </section>
    </>
  )
}

export const getStaticProps = async () => {
  const { data } = getAllCourses()

  return {
    props: {
      courses: data,
    },
  }
}

OwnedCourses.Layout = BaseLayout

export default OwnedCourses
