import axios from 'axios'
export default async function({ store, route, redirect }) {
  if (route.path.includes('validator/student-loan')) {
    if (route.query.paid) {
      if (route.query.paid.includes('true')) {
        let schoolRes = await axios
          .get(`/api/Schools/${route.query.schoolId}/sen`)
          .then(res => {
            return res.data
          })
          .catch(err => {
            console.log('Error: ' + err)
            if (process.env.NODE_ENV === 'production') {
              redirect(
                `/question/student-loan?invalid=true&schoolId=${
                  route.query.schoolId
                }`
              )
            } else {
              redirect(
                `/question/student-loan?invalid=true&schoolId=${
                  route.query.schoolId
                }&apiError=${err}`
              )
            }
          })
        if (schoolRes) {
          redirect('/question/still-teaching-uk')
        } else {
          redirect(`/question/subjects-taught?schoolId=${route.query.schoolId}`)
        }
        redirect(
          `/question/student-loan?invalid=true&schoolId=${route.query.schoolId}`
        )
      } else if (route.query.paid.includes('false')) {
        redirect(`/not-eligible/student-loan?schoolId=${route.query.schoolId}`)
      }
    }
    redirect(
      `/question/student-loan?invalid=true&schoolId=${route.query.schoolId}`
    )
  }
}
