console.log('connected!')
//console.log(location.href.includes('/profile'))

if(location.href.includes('/mood')){
  console.log('on mood')
  $('.menu a').removeClass('active')
  $('.mood').addClass('active')
  // $('.mood').addClass('active')
} else if (location.href.includes('/timeline')){
  console.log('on timeline')
  $('.main').removeClass('active')
  $('.timeline').removeClass('active')
  $('.mood').removeClass('active')
  $('.timeline').addClass('active')
} else {
  console.log('else')
  $('.main').removeClass('active')
  $('.timeline').removeClass('active')
  $('.mood').removeClass('active')
  $('.main').addClass('active')
}