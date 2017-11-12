var makeTest = require('./context')
var Bottleneck = require('../lib/index.js')

describe('Promises', function () {
  it('Should support promises', function (done) {
    var c = makeTest({maxConcurrent: 1, minTime: 250})

    c.limiter.submit(c.job, null, 1, 9, c.noErrVal(1, 9))
    c.limiter.submit(c.job, null, 2, c.noErrVal(2))
    c.limiter.submit(c.job, null, 3, c.noErrVal(3))
    c.pNoErrVal(c.limiter.schedule(c.promise, null, 4, 5), 4, 5)
    c.last(function (err, results) {
      c.checkResultsOrder([[1,9], [2], [3], [4,5]])
      c.checkDuration(750)
      done()
    })
  })

  it('Should pass error on failure', function (done) {
    var failureMessage = 'failed'
    var c = makeTest({maxConcurrent: 1, minTime: 250})

    c.limiter.schedule(c.promise, new Error(failureMessage))
    .catch(function (err) {
      c.mustEqual(err.message, failureMessage)
      done()
    })
  })

  it('Should get rejected when rejectOnDrop is true', function (done) {
    var c = makeTest({maxConcurrent: 1, minTime: 250, highWater: 1, rejectOnDrop: true})
    var dropped = false
    var checkedError = false

    c.limiter.on('dropped', function () {
      dropped = true
      if (dropped && checkedError) {
        done()
      }
    })

    c.pNoErrVal(c.limiter.schedule(c.promise, null, 1), 1)

    c.limiter.schedule(c.promise, null, 2)
    .catch(function (err) {
      c.mustEqual(err.message, 'This job has been dropped by Bottleneck')
      checkedError = true
      if (dropped && checkedError) {
        done()
      }
    })

    c.pNoErrVal(c.limiter.schedule(c.promise, null, 3), 3)
  })

  it('Should wrap', function (done) {
    var c = makeTest({maxConcurrent: 1, minTime: 250})

    c.limiter.submit(c.job, null, 1, c.noErrVal(1))
    c.limiter.submit(c.job, null, 2, c.noErrVal(2))
    c.limiter.submit(c.job, null, 3, c.noErrVal(3))

    var wrapped = c.limiter.wrap(c.promise)
    c.pNoErrVal(wrapped(null, 4), 4)

    c.last(function (err, results) {
      c.checkResultsOrder([[1], [2], [3], [4]])
      c.checkDuration(750)
      done()
    })
  })

  it('Should pass errors when wrapped', function (done) {
    var failureMessage = 'BLEW UP!!!'
    var c = makeTest({maxConcurrent: 1, minTime: 250})

    var wrapped = c.limiter.wrap(c.promise)
    c.pNoErrVal(wrapped(null, 1), 1)
    c.pNoErrVal(wrapped(null, 2), 2)

    wrapped(new Error(failureMessage), 3)
    .catch(function (err) {
      c.mustEqual(err.message, failureMessage)
      c.last(function (err, results) {
        c.checkResultsOrder([[1], [2], [3]])
        c.checkDuration(500)
        done()
      })
    })
  })
})
