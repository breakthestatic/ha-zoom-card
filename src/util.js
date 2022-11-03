export const removeBorders = (element) => {
  Object.assign(element.style, {
    boxShadow: "none",
    borderRadius: "0px",
    border: "none",
  })
}
