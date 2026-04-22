import { reactive, computed, toValue, toRaw, ref, watch, onMounted } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';
import { AppMapList } from '../ui/app-map-list/AppMapList.js'
// import ham from 'ham';
// con)st { getPanZoom, template, utils, download, TwoWayMap } = ham;
import { useAppState } from '../store/app.store.js';

const DisplayState = {
	expanded: 'expanded',
	collapsed: 'collapsed',
}

const debugFields = {
	start: new DOMPoint(),
	goal: new DOMPoint(),
	current: {},
	current: new DOMPoint(),
}

export const AppFloatingMenu = defineComponent(
	getTemplate('app-floating-menu'),
	(props) => {
		const appStore = useAppState();

		const appEl = document.querySelector('#app-host');
		let stopDrag

		const floatingMenuRef = ref(null);
		const canvasViewportRef = ref(null);
		const displayMode = ref('list');

		const currentPoint = ref({ x: 0, y: 0 });
		const pointerStart = ref({ x: 0, y: 0 });

		const bounds = computed(() => ({
			x: appEl.clientWidth,
			y: appEl.clientHeight,
		}));

		const isListMode = computed(() => displayMode.value === 'list');
		const isDebugMode = computed(() => displayMode.value === 'debug');
		const tile = computed(() => appStore.currentNode.value || {});
		const selectionButtonText = computed(() => isListMode.value ? 'debug' : 'list');

		const prev = ref(null)

		const changed = computed(() => {
			if (!prev.value || !appStore.currentNode.value.value) return {}

			const t = appStore.currentNode.value
			const p = prev.value

			return {
				id: t.id !== p.id,
				tileType: t.tileType !== p.tileType,
				x: t.x !== p.x,
				y: t.y !== p.y,
				address: t.address !== p.address,
				target: JSON.stringify(t.target) !== JSON.stringify(p.target),
				active: t.active !== p.active,
				linkedMapId: t.linkedMapId !== p.linkedMapId
			}
		})

		watch(changed, (t) => {
			// t = toValue(t)
			// console.warn(t)
		})

		watch(appStore.currentNode, (t) => {
			t = toValue(t)
			prev.value = t ? JSON.parse(JSON.stringify(toRaw(t))) : null
		}, { deep: true })





		const displayState = ref(DisplayState.collapsed);


		const handlePanelButtonClick = () => {
			displayMode.value = isListMode.value ? 'debug' : 'list';
		}


		const attachDrag = () => {

			const onDrag = ({ target, clientX: x, clientY: y }) => {
				if (displayState.value !== DisplayState.collapsed) {
					return
				}

				currentPoint.value.x = (x) // - pointerStart.value.x)
				currentPoint.value.y = (y) // - pointerStart.value.y)

				// if (Math.abs(x - currentPoint.value.x) < 5 || Math.abs(y - currentPoint.value.y) < 5) return;

				// if (x + 25 >= bounds.value.x) {
				//   x = bounds.value.x - 25
				// }
				// if (y + 25 >= bounds.value.y) {
				//   y = bounds.value.y - 25
				// }

				floatingMenuRef.value.style.top = `${currentPoint.value.y-25}px`;
				floatingMenuRef.value.style.left = `${currentPoint.value.x-25}px`;
			};

			const onPointerUp = ({ target, clientX: x, clientY: y }) => {
				currentPoint.value.x = 0 //x;
				currentPoint.value.y = 0 //y;
				// pointerStart.value.x = 0 //x;
				// pointerStart.value.y = 0 //y;

				floatingMenuRef.value.addEventListener('pointerdown', onPointerDown);
				floatingMenuRef.value.removeEventListener('pointermove', onDrag);
				floatingMenuRef.value.removeEventListener('pointerup', onPointerUp);
			};

			const onPointerDown = ({ target, clientX: x, clientY: y }) => {
				pointerStart.value.x = x;
				pointerStart.value.y = y;
				currentPoint.value.x = x;
				currentPoint.value.y = y;

				floatingMenuRef.value.addEventListener('pointermove', onDrag);
				floatingMenuRef.value.addEventListener('pointerup', onPointerUp);
				floatingMenuRef.value.removeEventListener('pointerdown', onPointerDown);
			};

			floatingMenuRef.value.addEventListener('pointerdown', onPointerDown);

			return () => {
				floatingMenuRef.value.removeEventListener('pointermove', onDrag)
				floatingMenuRef.value.removeEventListener('pointerup', onPointerUp)
				floatingMenuRef.value.removeEventListener('pointerdown', onPointerDown)
			}
		};

		const handleDisplayChange = (newState = null) => {
			if (!newState) {
				displayState.value = displayState.value === 'collapsed' ? 'expanded' : 'collapsed';
			} else {
				displayState.value = newState;
			}

			if (newState === 'expanded') {
				// getPanZoom(canvasViewportRef.value.parentElement);

			}
		};

		onMounted(() => {
			floatingMenuRef.value.addEventListener('click', (e) => handleDisplayChange(null));
			stopDrag = attachDrag();
		});

		return {
			floatingMenuRef,
			displayState,
			handleDisplayChange,
			isListMode,
			isDebugMode,
			displayMode,
			tile,
			changed,
			currentNode: appStore.currentNode,
			selectionButtonText,
			handlePanelButtonClick
		}
	},
	{
		components: {
			'app-map-list': AppMapList,
		}
	},
)
