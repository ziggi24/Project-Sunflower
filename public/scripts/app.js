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
} else if (location.href.includes('/profile')) {
  console.log('else')
  $('.main').removeClass('active')
  $('.timeline').removeClass('active')
  $('.mood').removeClass('active')
  $('.main').addClass('active')
  $('.menu .item')
  .tab()
;
}

$('.dropdown')
  .dropdown({
    // you can use any ui transition
    transition: 'slide down'
  })
;
// $('.menu .item')
//   .tab()
// ;