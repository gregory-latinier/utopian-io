<script>
import i18nDropdownSwitcher from 'src/components/i18n/i18n-dropdown-switcher'

export default {
  name: 'u-auth-main',
  components: {
    i18nDropdownSwitcher
  },
  data () {
    return {
      transitionDuration: {
        enter: 100,
        leave: 100
      },
      controls: null
    }
  }
}
</script>

<template lang="pug">
q-layout.u-auth-layout.row
  .col-md-12.col-sm-12.col-xs-12.auth-pane
    // i18nDropdownSwitcher.i18n-dropdown
    .flex.items-center.justify-center.full-height
      transition(:duration="{ enter: 100, leave: 100 }", enter-active-class="animated fadeIn", leave-active-class="animated fadeOut")
        router-view(:key="$route.path")
</template>

<style lang="stylus">
@import "~variables"
body
  overflow hidden
  background #FAFAFA
.u-auth-layout
  .auth-pane
    position relative
    height 100%
    overflow auto
    .i18n-dropdown
      position absolute
      right 0
</style>
