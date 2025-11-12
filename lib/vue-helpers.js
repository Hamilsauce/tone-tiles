export const defineComponent = (template, setupFn = () => {}, options = {}) => {
  return {
    template,
    props: setupFn.props || [],
    components: options.components || {},
    setup: setupFn,
  }
}

export const getTemplate = (name, asOuterHTML = true) => {
  const t = document.querySelector(`[data-component="${name}"]`)
    .content.firstElementChild
    .cloneNode(true);
  
  return asOuterHTML ? t.outerHTML : t;
}