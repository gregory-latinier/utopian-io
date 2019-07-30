<script>
import { debounce, Loading } from 'quasar'
import { mapActions, mapGetters } from 'vuex'
import { required, minLength, maxLength, helpers } from 'vuelidate/lib/validators'

import * as randombytes from 'randombytes'
import * as bigi from 'bigi'
import * as bs58 from 'bs58'
import { Point, getCurveByName } from 'ecurve'
import createHash from 'create-hash'

export default {
  name: 'u-page-steem-create',
  data () {
    return {
      user: {
        username: '',
        password: randombytes(32).toString('hex'),
        keys: {},
        usernameAvailable: ''
      }
    }
  },
  validations: {
    ...mapGetters('api', ['getTokens']),
    user: {
      username: {
        required,
        minLength: minLength(3),
        maxLength: maxLength(32),
        usernameAvailable: (value, vm) => vm.usernameAvailable,
        regex: helpers.regex('alpha', /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/)
      },
      password: {
        required,
        minLength: minLength(8)
      }
    }
  },
  methods: {
    ...mapActions('users', ['hasClaimedBlockchainAccount', 'isSteemUsernameAvailable', 'createSteemAccount']),
    validateUsername () {
      this.user.usernameAvailable = 'checking'
      this.checkUsername()
    },

    checkUsername: debounce(async function () {
      const usernameValidator = this.$v.user.username
      this.$v.user.$touch()
      if (this.user.username.length > 2 && usernameValidator.minLength &&
        usernameValidator.maxLength && usernameValidator.regex) {
        this.user.usernameAvailable = await this.isSteemUsernameAvailable(this.user.username)
      }
      if (this.user.usernameAvailable === 'checking') {
        this.user.usernameAvailable = ''
      }
    }, 1000),

    generateKeys () {
      const pubKeys = {}
      const roles = ['owner', 'active', 'posting', 'memo']
      const { username, password } = this.user
      roles.forEach(function (role) {
        const seed = username + role + password
        const brainKey = seed.trim().split(/[\t\n\v\f\r ]+/).join(' ')
        const hashSha256 = createHash('sha256').update(brainKey).digest()
        const bigInt = bigi.fromBuffer(hashSha256)
        const toPubKey = getCurveByName('secp256k1').G.multiply(bigInt)
        const point = new Point(toPubKey.curve, toPubKey.x, toPubKey.y, toPubKey.z)
        const pubBuf = point.getEncoded(toPubKey.compressed)
        const checksum = createHash('ripemd160').update(pubBuf).digest()
        const addy = Buffer.concat([pubBuf, checksum.slice(0, 4)])
        pubKeys[role] = 'STM' + bs58.encode(addy)
      })
      this.user.keys = pubKeys
    },

    getErrorLabel (field) {
      const usernameValidator = this.$v.user.username
      if (!usernameValidator.minLength) {
        return 'The username should be at least 3 characters long.'
      } else if (!usernameValidator.maxLength) {
        return 'The username should have the maximum of 32 characters.'
      } else if (!usernameValidator.regex) {
        return 'Please use alphanumeric characters. Dot, underscore and dash are allowed as separators.'
      } else if (!usernameValidator.usernameAvailable) {
        return 'Sorry. This username is not available.'
      }
      return ''
    },

    async submit () {
      this.$v.user.$touch()
      Loading.show({ message: 'Creating Steem account...' })
      try {
        await this.createSteemAccount({ username: this.user.username, keys: this.user.keys })
        this.$q.dialog({
          title: 'Success!',
          message: 'You have successfully created your Steem account',
          ok: 'Ok',
          color: 'success'
        })
        Loading.hide()
      } catch (err) {
        Loading.hide()
      }
    }
  },

  async mounted () {
    const userHasClaimedSteemAccount = await this.hasClaimedBlockchainAccount('steem')
    if (userHasClaimedSteemAccount) {
      this.$q.dialog({
        title: this.$t('auth.steemCreate.modal.title'),
        message: this.$t('auth.steemCreate.modal.message'),
        ok: this.$t('auth.steemCreate.modal.ok'),
        color: 'primary',
        preventClose: true
      }).then(() => {
        if (typeof window !== 'undefined') window.location = this.$route.query.redirectUrl || process.env.UTOPIAN_DOMAIN
      })
    } else {
      this.generateKeys()
      this.$nextTick(() => this.$refs.username.$el.children[2].children[0].children[1].focus())
    }
  }
}
</script>
<template lang="pug">
.u-page-steem-create
  .q-subheading.q-mb-sm {{ $t('auth.steemCreate.text') }}
  .q-body-1.text-grey.q-mb-lg {{ $t('auth.steemCreate.smallerText') }}
  .q-body-1.text-grey Username
    q-field.full-width.q-mb-md(
      :error="$v.user.username.$error && user.usernameAvailable !== 'checking'",
      :error-label="getErrorLabel()"
    )
      q-input(
        ref="username"
        v-model.trim="user.username",
        placeholder="ada.lovelace",
        :before="[{ icon: 'mdi-account' }]",
        prefix="@"
        maxlength="32"
        @input="validateUsername()"
        :loading="user.usernameAvailable === 'checking'"
        :color="user.usernameAvailable === true ? 'green' : 'primary'"
      )
  .q-body-1.text-grey Password
    q-field.full-width.q-mb-md(
      :error="$v.user.password.$error",
      error-label="The password should have at least 8 characters."
    )
      q-input(v-model="user.password" @input="this.$v.user.password.$touch", :before="[{ icon: 'mdi-textbox-password' }]")

  .q-body-1.text-grey Owner Key
    q-field.full-width.q-mb-md(
      disabled
    )
      q-input(v-model="user.keys.owner" disabled, :before="[{ icon: 'mdi-key' }]")

  .q-body-1.text-grey Active Key
    q-field.full-width.q-mb-md(
      disabled
    )
      q-input(v-model="user.keys.active" disabled, :before="[{ icon: 'mdi-key' }]")

  .q-body-1.text-grey Posting Key
    q-field.full-width.q-mb-md(
      disabled
    )
      q-input(v-model="user.keys.posting" disabled, :before="[{ icon: 'mdi-key' }]")

  .q-body-1.text-grey Memo Key
    q-field.full-width.q-mb-md(
      disabled
    )
      q-input(v-model="user.keys.memo" disabled, :before="[{ icon: 'mdi-key' }]")

  q-btn.full-width(
    color="primary",
    no-caps,
    :label="$t('auth.signup.create')",
    :disabled="user.usernameAvailable !== true || $v.user.password.$error"
    @click="submit"
  )

</template>

<style lang="stylus">
  .u-page-steem-create {
    .q-if-addon-left {
      margin-top 5px
    }
    .q-field {
      height 75px
    }
  }
</style>
