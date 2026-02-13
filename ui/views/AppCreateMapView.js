import { ref, computed, watch } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js'
import { router, RouteName } from '../../router/router.js'
import { useMapStore } from '../../store/map.store.js';

// TODO: replace with your actual Firestore service
// import { createMapDoc } from '../../services/maps.js'

export const AppCreateMapView = defineComponent(
  getTemplate('app-map-creation'),
  (props) => {
    const mapStore = useMapStore();
    
    const name = ref('');
    const width = ref(32);
    const height = ref(32);
    const tileSize = ref(24);
    
    const initFill = ref('empty')
    const startPlacement = ref('bottom-left');
    const exitPlacement = ref('bottom-right');
    const openInEditor = ref(true)
    
    const preset = ref('custom');
    const PRESETS = {
      small: { width: 16, height: 16, tileSize: 24 },
      medium: { width: 32, height: 32, tileSize: 24 },
      large: { width: 64, height: 64, tileSize: 20 }
    }
    
    const applyPreset = (key) => {
      if (!PRESETS[key]) return
      preset.value = key
      width.value = PRESETS[key].width
      height.value = PRESETS[key].height
      tileSize.value = PRESETS[key].tileSize
    }
    
    /* If user manually edits dimensions, revert to custom */
    watch([width, height, tileSize], () => {
      const match = Object.entries(PRESETS).find(
        ([_, p]) =>
        p.width === width.value &&
        p.height === height.value &&
        p.tileSize === tileSize.value
      )
      
      preset.value = match ? match[0] : 'custom'
    })
    
    /* -------------------------
     * Validation
     * ------------------------- */
    
    const isValid = computed(() => {
      return (
        width.value >= 4 &&
        height.value >= 4 &&
        tileSize.value >= 8
      )
    })
    
    /* -------------------------
     * Cancel
     * ------------------------- */
    
    const handleCancel = () => {
      router.back()
    }
    
    /* -------------------------
     * Create Map
     * ------------------------- */
    
    const handleCreate = async () => {
      if (!isValid.value) return
      
      const mapDoc = {
        name: name.value?.trim() || `Untitled ${new Date().toLocaleDateString()}`,
        width: width.value,
        height: height.value,
        // tileSize: tileSize.value,
        // initFill: initFill.value,
        // startPlacement: startPlacement.value,
        // exitPlacement: exitPlacement.value,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      mapStore.setCurrentMap(mapDoc)
      try {
        console.warn(
          'create: ', mapDoc
        )
        // const id = await createMapDoc(mapDoc)
        router.push({
          name: RouteName.home,
          query: { mapID: 'fuk' } //mapStore.currentMap.value.id || 'no-id' }
        })   
        if (openInEditor.value) {
          
        } else {
          // router.push({ name: RouteName.MAPS })
        }
        
      } catch (err) {
        console.error('Failed to create map', err)
      }
    }
    
    /* -------------------------
     * Return to template
     * ------------------------- */
    
    return {
      name,
      width,
      height,
      tileSize,
      initFill,
      startPlacement,
      exitPlacement,
      openInEditor,
      preset,
      applyPreset,
      isValid,
      handleCancel,
      handleCreate
    }
  },
  {
    components: {}
  },
)