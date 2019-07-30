import API from 'src/plugins/api'

export const transferToLocalStorage = ({ state, commit }) => {
  state.localStorageData.forEach(obj => {
    localStorage.setItem(obj.key, obj.value)
  })
  commit('clearLocalStorageValues')
}

export const getCategories = async (context, lang) => {
  if (context.rootState.utils.categories.length === 0) {
    const payload = await API.call({
      context,
      method: 'get',
      url: `/v1/categories/${lang}`
    })
    context.commit('setCategories', payload)
  }
}

export const clearAppError = ({ commit }) => commit('setAppError', null)
export const setAppError = ({ commit }, value) => commit('setAppError', value)
export const clearAppSuccess = ({ commit }) => commit('setAppSuccess', null)
export const setAppSuccess = ({ commit }, value) => commit('setAppSuccess', value)
