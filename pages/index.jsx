import { Hero } from '@components/ui/common'
import { CourseCard, CourseList } from '@components/ui/course'
import { BaseLayout } from '@components/ui/layout'
import { getAllCourses } from '@content/courses/fetcher'

const Home = ({ courses }) => {
  return (
    <>
      <Hero />

      <CourseList courses={courses}>{(course) => <CourseCard course={course} key={course.id} />}</CourseList>
    </>
  )
}

Home.Layout = BaseLayout

export default Home

export const getStaticProps = async () => {
  const { data } = getAllCourses()

  return {
    props: {
      courses: data,
    },
  }
}
