export const pushLocalStorageValues = (state, values) => {
  state.localStorageData = state.localStorageData.concat(values)
}

export const clearLocalStorageValues = (state) => {
  state.localStorageData = []
}

export const setAppError = (state, appError) => {
  state.appError = appError
}

export const setAppSuccess = (state, appSuccess) => {
  state.appSuccess = appSuccess
}

export const setCategories = (state, categories) => {
  state.categories = categories || []
}
