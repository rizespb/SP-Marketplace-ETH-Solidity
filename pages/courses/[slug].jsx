import { useAccount, useOwnedCourse } from '@components/hooks/web3'
import { useWeb3 } from '@components/providers'
import { Message, Modal } from '@components/ui/common'
import { CourseHero, Curriculum, KeyPoints } from '@components/ui/course'
import { BaseLayout } from '@components/ui/layout'
import { getAllCourses } from '@content/courses/fetcher'

const Course = ({ course }) => {
  const { isLoading } = useWeb3()
  const { account } = useAccount()
  const { ownedCourse } = useOwnedCourse(course, account.data)

  const courseState = ownedCourse.data?.state

  const isLocked = !courseState || courseState === 'purchased' || courseState === 'deactivated'

  return (
    <>
      <div className="py-4">
        <CourseHero hasOwner={!!ownedCourse.data} title={course.title} description={course.description} image={course.coverImage} />
      </div>

      <KeyPoints points={course.wsl} />

      {courseState && (
        <div className="max-w-5xl mx-auto">
          {courseState === 'purchased' && (
            <Message type="warning">
              Course is purchased and waiting for the activation. Process can take up to 24 hours.
              <i className="block font-normal">In case of any questions, please contact info@coursemarketplace.io</i>
            </Message>
          )}

          {courseState === 'activated' && <Message type="success">We wish you happy watching of the course!</Message>}

          {courseState === 'deactivated' && (
            <Message type="danger">
              Course has beed deactivated, due the incorrect purchase data. The fuctionality to watch the course has been temporaly disabled.
              <i className="block font-normal">Please contact info@coursemarketplace.io</i>
            </Message>
          )}
        </div>
      )}

      <Curriculum locked={isLocked} courseState={courseState} isLoading={isLoading} />

      <Modal />
    </>
  )
}

Course.Layout = BaseLayout

export default Course

export const getStaticPaths = async () => {
  const { data } = getAllCourses()

  return {
    paths: data.map((course) => ({
      params: {
        slug: course.slug,
      },
    })),
    fallback: false,
  }
}

export const getStaticProps = async ({ params }) => {
  const { slug } = params

  const { data } = getAllCourses()

  const course = data.filter((course) => course.slug === slug)[0]

  return {
    props: {
      course,
    },
  }
}
