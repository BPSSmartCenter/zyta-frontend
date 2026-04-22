# Card Sandbox Feature

เอกสารนี้อธิบายโครงสร้างของ `cardSandbox` สำหรับคนที่จะมาพัฒนาต่อ เช่น เพิ่ม card ใหม่, ลบ card, เปลี่ยน default layout, หรือแก้ logic drag/resize/pan/zoom

## ภาพรวม

`cardSandbox` เป็น feature สำหรับทดลอง dashboard card แบบอิสระ คล้าย canvas/board:

- card ลากตำแหน่งได้
- card resize ได้
- card ย่อ/ขยายได้
- card ปิด/ลบได้
- card ที่ click ล่าสุดจะถูกยกขึ้นบนสุดอัตโนมัติ
- sandbox board pan ได้ด้วยการกดค้างแล้วลากพื้นที่ว่าง
- mouse wheel ใช้ zoom board
- layout ถูก persist ลง `localStorage` หลัง refresh แล้วยังอยู่เหมือนเดิม

แนวคิดหลักคือ **card shell เดียว แต่ content เปลี่ยนตาม `card.kind`**

## โครงสร้างไฟล์

```txt
src/features/cardSandbox/
  types.ts
  cardSandboxSlice.ts
  cardSandboxSelectors.ts
  cardSandboxStorage.ts
  geometry.ts
  useLayeredCards.ts
  useCardBoardInteractions.ts
  useSandboxPan.ts
  SandboxFilterControlCard.tsx
  SandboxMapPanelCard.tsx
  SandboxDashboardEventsCard.tsx
  SandboxDashboardWidgetCard.tsx
  index.ts
```

หน้าที่ของแต่ละไฟล์:

- `types.ts`  
  นิยาม type หลักของ card, card kind, rect, Redux state

- `cardSandboxSlice.ts`  
  Redux slice หลัก เก็บ cards, selected card, filter/search state และ reducers เช่น add/delete/resize/layer/reset

- `cardSandboxSelectors.ts`  
  selectors สำหรับอ่าน state จาก Redux

- `cardSandboxStorage.ts`  
  load/save sandbox state ลง `localStorage`

- `geometry.ts`  
  helper geometry สำหรับ drag/resize เช่น clamp rect ให้อยู่ใน bounds

- `useLayeredCards.ts`  
  hook facade สำหรับ UI ใช้เรียก action ของ Redux แบบง่ายขึ้น

- `useCardBoardInteractions.ts`  
  logic pointer interaction สำหรับ drag card และ resize card

- `useSandboxPan.ts`  
  logic pointer interaction สำหรับ pan/scroll board โดยลากพื้นที่ว่าง

- `SandboxFilterControlCard.tsx`  
  card สำหรับเลือก site/period ของ filter group สีเดียวกัน

- `SandboxMapPanelCard.tsx`  
  adapter สำหรับเอา `MapPanel` มาใช้ใน card sandbox

- `SandboxDashboardEventsCard.tsx`  
  adapter สำหรับ `AlertEvents` และ `WellBeingEvents`

- `SandboxDashboardWidgetCard.tsx`  
  adapter สำหรับ `ZYTAEvents`, `FaceRecognize`, `DeviceCount`, `UserManagement`, `SnapshotChartSection`

- `index.ts`  
  barrel exports ของ feature นี้

ตัว render board หลักไม่ได้อยู่ใน folder นี้ แต่อยู่ที่:

```txt
src/pages/CardSandboxPage/index.tsx
```

## Data Model

Card ทุกใบใช้ shape เดียวกัน:

```ts
export type SandboxCardKind =
  | "blank"
  | "filters"
  | "map"
  | "alerts"
  | "wellbeing"
  | "zyta"
  | "facerec"
  | "devices"
  | "users"
  | "snapshot";

export type SandboxCardRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SandboxCard = SandboxCardRect & {
  id: SandboxCardId;
  kind: SandboxCardKind;
  filterGroupId: SandboxFilterGroupId;
  title: string;
  color: string;
  zIndex: number;
  collapsed: boolean;
  expandedSize?: {
    width: number;
    height: number;
  };
};
```

Field สำคัญ:

- `kind` ใช้ตัดสินว่าจะ render component อะไร
- `filterGroupId` ชี้ว่า card นี้ใช้ filter group สีไหน
- `x`, `y`, `width`, `height` คือ layout ของ card
- `zIndex` ใช้ภายในสำหรับเรียง layer เท่านั้น ไม่แสดงใน UI
- `collapsed` คือสถานะย่อ card
- `expandedSize` เก็บขนาดก่อนย่อ เพื่อ restore ตอนขยายกลับ

## Filter Group By Color

Sandbox ไม่มี state กลางของ site/date แบบหน้า dashboard หลักแล้ว แต่ใช้ `filterGroups` แทน:

- card ทุกใบมีปุ่มเลือกสีบน titlebar
- สีเดียวกันหมายถึงใช้ filter group เดียวกัน
- card ที่อยู่ group เดียวกันจะแชร์ `selectedSite`, `date`, event filter, severity และ province
- ถ้าต้องการให้ Map card สองใบเลือก site/date คนละชุด ให้ตั้งคนละสี
- ถ้าต้องการให้หลาย feature ดู site/date เดียวกัน ให้ตั้งสีเดียวกัน
- การเลือก site/period ทำผ่าน `filters` card หรือ `SandboxFilterControlCard` ของสีเดียวกัน ไม่ได้อยู่บน titlebar ของทุก card

แนวคิดนี้ช่วยลดการต้องเลือก site ซ้ำหลายรอบ: ผู้ใช้ตั้ง group สีหนึ่งเป็น site A แล้วลาก card ที่เกี่ยวข้องไปใช้สีนั้นได้ทันที

## Redux State

State หลักอยู่ใน `CardSandboxState`:

```ts
export type CardSandboxState = {
  cards: SandboxCard[];
  selectedId: SandboxCardId | null;
  filterGroups: Record<SandboxFilterGroupId, SandboxFilterGroup>;
  activeFilterGroupId: SandboxFilterGroupId;
  eventPanels: {
    alertSearch: string;
    wellbeingSearch: string;
    faceSearch: string;
    zytaSearch: string;
  };
};
```

แนวทางปัจจุบัน:

- layout ของ card เก็บใน `cards`
- state ของ site/date/filter หลักเก็บใน `filterGroups`
- card ผูกกับ group ผ่าน `card.filterGroupId`
- `activeFilterGroupId` ใช้เป็น default ตอนกดเพิ่ม card ใหม่
- state ที่เป็น filter/search เฉพาะ widget เก็บแยกใน slice เดียวกัน เช่น `eventPanels`
- ไม่เก็บ React local state สำหรับ filter ที่ต้อง persist หรือ share ระหว่าง card

## Rendering Flow

Rendering หลักอยู่ใน `src/pages/CardSandboxPage/index.tsx`

ลำดับโดยรวม:

1. `useLayeredCards()` อ่านและ dispatch card state จาก Redux
2. sort card ด้วย `zIndex`
3. render `SandboxLayerCard` ทีละใบ
4. `SandboxLayerCard` สร้าง shell ให้ทุก card เหมือนกัน
5. content ข้างในเลือกจาก `card.kind`

เมื่อผู้ใช้ click card ใด ๆ reducer `selectCard` จะปรับ `zIndex` ของ card นั้นให้สูงสุด แล้ว normalize layer ใหม่ ดังนั้นไม่ต้องมีปุ่ม bring front/back ใน UI

Pattern render content:

```tsx
{card.kind === "filters" ? (
  <SandboxFilterControlCard cardId={card.id} />
) : card.kind === "map" ? (
  <SandboxMapPanelCard cardId={card.id} />
) : card.kind === "alerts" || card.kind === "wellbeing" ? (
  <SandboxDashboardEventsCard cardId={card.id} variant={card.kind} />
) : isDashboardWidgetKind(card.kind) ? (
  <SandboxDashboardWidgetCard cardId={card.id} variant={card.kind} />
) : (
  <BlankCard />
)}
```

Shell ของ card เป็นคนดูแล:

- absolute position
- header
- drag handle
- collapse button
- close button
- resize handles
- selected style

Content component ไม่ควรต้องรู้เรื่อง drag/resize/layout

## Persistence

Sandbox state ถูก persist ลง `localStorage` ที่ key:

```ts
bps.cardSandbox.v1
```

อยู่ใน `cardSandboxStorage.ts`

ข้อสำคัญ:

- `cardSandboxSlice.ts` จะ load state จาก storage ก่อน ถ้ามี state ที่ valid
- ถ้าไม่มี storage จะใช้ `createDefaultState()`
- `resetCardSandbox()` จะกลับ default layout จาก `initialCards`
- ถ้าเพิ่ม card ใหม่ใน `initialCards` แต่ browser มี layout เก่าถูก persist อยู่ card ใหม่จะยังไม่โผล่อัตโนมัติ ผู้ใช้ต้องกด Reset หรือเพิ่มจาก toolbar

ถ้าเพิ่ม `SandboxCardKind` ใหม่ ต้องเพิ่มใน `CARD_KINDS` ของ `cardSandboxStorage.ts` ด้วย ไม่อย่างนั้น layout ที่มี kind ใหม่อาจถูก sanitize ทิ้ง

## การเพิ่ม Card Kind ใหม่

ตัวอย่าง: เพิ่ม card ใหม่ชื่อ `weather`

### 1. เพิ่ม kind ใน `types.ts`

```ts
export type SandboxCardKind =
  | "blank"
  | "filters"
  | "map"
  | "alerts"
  | "wellbeing"
  | "zyta"
  | "facerec"
  | "devices"
  | "users"
  | "snapshot"
  | "weather";
```

### 2. เพิ่ม kind ใน storage allowlist

ใน `cardSandboxStorage.ts`:

```ts
const CARD_KINDS = new Set<SandboxCardKind>([
  "blank",
  "filters",
  "map",
  "alerts",
  "wellbeing",
  "zyta",
  "facerec",
  "devices",
  "users",
  "snapshot",
  "weather",
]);
```

### 3. เพิ่ม default card config ใน `createCard`

ใน `cardSandboxSlice.ts`:

```ts
const titleByKind: Record<SandboxCardKind, string> = {
  blank: `Card ${index + 1}`,
  filters: "Main Filters",
  map: "Map Panel",
  alerts: "Alert Events",
  wellbeing: "Well-being Events",
  zyta: "ZYTA Events",
  facerec: "Face Recognize",
  devices: "Device Count",
  users: "User Management",
  snapshot: "Snapshot Chart",
  weather: "Weather",
};
```

แล้วกำหนด default size ใน return:

```ts
width: kind === "weather" ? 520 : existingWidthLogic,
height: kind === "weather" ? 360 : existingHeightLogic,
```

### 4. สร้าง adapter component

ถ้า component ต้องแปลง data จาก context/API/Redux ก่อน ควรสร้าง adapter ใน folder นี้ เช่น:

```txt
SandboxWeatherCard.tsx
```

ตัวอย่าง shape:

```tsx
export default function SandboxWeatherCard() {
  // read Redux/context/API here
  return <WeatherWidget />;
}
```

Adapter ควรรับผิดชอบเรื่อง:

- map props ให้ component เดิม
- filter data ตาม selected site/date
- dispatch Redux action สำหรับ search/filter
- ป้องกัน API polling ที่ไม่จำเป็นด้วย `enabled` ถ้ามี

### 5. export ใน `index.ts`

```ts
export { default as SandboxWeatherCard } from "./SandboxWeatherCard";
```

### 6. เพิ่ม render branch ใน `CardSandboxPage`

ใน `src/pages/CardSandboxPage/index.tsx`:

```tsx
card.kind === "weather" ? (
  <SandboxWeatherCard />
) : ...
```

ถ้าอยากรวมกับกลุ่ม dashboard widget ให้เพิ่มใน `dashboardWidgetKinds` และ `SandboxDashboardWidgetCard` แทน

### 7. เพิ่มปุ่มบน toolbar

ใน `CardSandboxPage`:

```tsx
<ToolButton
  icon="cloud"
  label="Add weather card"
  onClick={() => addCard("weather")}
/>
```

### 8. เพิ่ม default layout ถ้าต้องการ

ใน `initialCards` ของ `cardSandboxSlice.ts` เพิ่ม card default:

```ts
{
  id: "card-weather",
  kind: "weather",
  title: "Weather",
  x: 120,
  y: 1600,
  width: 520,
  height: 360,
  color: "#e0f2fe",
  zIndex: 110,
  collapsed: false,
  filterGroupId: "group-blue",
}
```

หมายเหตุ: ถ้า user มี layout เก่าใน localStorage อยู่ default card ใหม่จะไม่แสดงจนกว่าจะ Reset

## การลบ Card Kind

ถ้าจะลบ kind ออก ต้องแก้จุดเหล่านี้:

1. ลบออกจาก `SandboxCardKind` ใน `types.ts`
2. ลบออกจาก `CARD_KINDS` ใน `cardSandboxStorage.ts`
3. ลบออกจาก `initialCards` ถ้ามี
4. ลบออกจาก `titleByKind` และ default size logic ใน `createCard`
5. ลบ toolbar button ใน `CardSandboxPage`
6. ลบ render branch หรือ adapter component ที่ไม่ใช้แล้ว
7. ตรวจ persisted state เก่า ถ้ามี kind ที่ลบแล้ว storage sanitizer จะ reject state นั้นและ fallback เป็น default

## การแก้ Default Layout

แก้ที่ `initialCards` ใน `cardSandboxSlice.ts`

ค่าที่ต้องระวัง:

- `id` ควร unique
- `zIndex` ควรเรียงเพิ่มทีละ 10 เพื่อให้ default stacking predict ได้ หลังจากใช้งานจริง card ที่ click ล่าสุดจะขึ้นบนสุดเอง
- `x`, `y`, `width`, `height` อยู่ใน board size
- `kind` ต้องมีอยู่ใน `SandboxCardKind`

Board ปัจจุบันอยู่ที่ `CardSandboxPage`:

```ts
const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;
const BOARD_COLS = 2;
const BOARD_ROWS = 2;
```

ดังนั้น board รวมคือ `3840 x 2160`

## การแก้ Interaction

### Drag/Resize Card

แก้ใน:

```txt
useCardBoardInteractions.ts
geometry.ts
```

หน้าที่:

- start drag
- start resize
- คำนวณตำแหน่งใหม่จาก pointer movement
- clamp card ให้อยู่ใน board bounds
- dispatch `updateCardRect`

### Pan Board

แก้ใน:

```txt
useSandboxPan.ts
```

จุดสำคัญ:

- pan เริ่มเฉพาะพื้นที่ว่าง
- ถ้ากดบน `[data-sandbox-card]` จะไม่ pan
- body cursor และ user-select ถูก override ระหว่าง pan แล้ว restore ตอนจบ

### Wheel Zoom

อยู่ใน:

```txt
src/pages/CardSandboxPage/index.tsx
```

ตอนนี้ wheel zoom จะยึดตำแหน่ง mouse เป็น anchor และจะไม่ intercept wheel ที่อยู่ใน `[data-sandbox-card-scroll]`

## Adapter Pattern

Card content ที่มาจาก dashboard เดิมไม่ควรเอา logic ทั้งหมดไปใส่ใน `CardSandboxPage`

ให้สร้าง adapter ใน feature folder แทน เช่น:

- `SandboxMapPanelCard.tsx`
- `SandboxFilterControlCard.tsx`
- `SandboxDashboardEventsCard.tsx`
- `SandboxDashboardWidgetCard.tsx`

Adapter ทำหน้าที่:

- อ่าน context เฉพาะ catalog/feed ที่จำเป็น เช่น `useFilters().siteOptions`, `useNotisFeed`
- อ่าน Redux sandbox state เช่น search/filter
- fetch API เฉพาะที่จำเป็น
- แปลง data ให้ component dashboard เดิม
- render component dashboard เดิม

สำหรับ card ที่ต้องใช้ site/date ให้รับ `cardId` แล้วอ่าน group ผ่าน `selectSandboxFilterGroupForCard(state, cardId)` เสมอ ไม่ใช้ global `FiltersContext.selectedSite/date` โดยตรง ไม่อย่างนั้น card หลายใบจะเปลี่ยน site/date พร้อมกันผิด scope

ถ้า card ใดต้องใช้ site/date filter ให้ใช้ pattern เดียวกับ Map:

```tsx
const filterGroup = useAppSelector((state) =>
  selectSandboxFilterGroupForCard(state, cardId)
);
```

แล้ว dispatch กลับเข้า reducer กลุ่ม `setFilterGroup...` เช่น `setFilterGroupSite`, `setFilterGroupDate`, `toggleFilterGroupEvent`

ข้อดี:

- `CardSandboxPage` ยังเป็น board renderer
- card shell ไม่ผูกกับ dashboard business logic
- เพิ่ม/แก้ widget ได้ง่ายขึ้น

## State Rules

ใช้ Redux เมื่อ:

- ค่าเป็น part ของ sandbox state
- ต้องจำหลัง refresh
- ต้องใช้ข้าม component
- เป็น filter/search ของ card

ใช้ local React state เมื่อ:

- เป็น transient UI state ภายใน adapter
- ไม่ต้อง persist
- ไม่กระทบ card อื่น

อย่าเก็บ DOM state หรือ pointer interaction state ลง Redux เพราะจะ dispatch ถี่เกินไปและทำให้ performance แย่

## Persistence Rules

ถ้าเพิ่ม field ใหม่ใน `CardSandboxState`:

1. เพิ่ม type ใน `types.ts`
2. เพิ่ม default value ใน `createDefaultState`
3. เพิ่ม sanitizer ใน `cardSandboxStorage.ts`
4. เพิ่ม reducer/action ถ้าต้อง update field นั้น
5. เพิ่ม selector ถ้ามี component อ่านบ่อย

ถ้าเปลี่ยน shape ใหญ่จนเข้ากันไม่ได้ ให้ bump:

```ts
const STORAGE_VERSION = 2;
const STORAGE_KEY = "bps.cardSandbox.v2";
```

หรือเขียน migration ก่อน load state

## Verification

หลังแก้ feature นี้ ควรรันอย่างน้อย:

```bash
npx tsc --noEmit --project tsconfig.app.json
npx eslint src/features/cardSandbox src/pages/CardSandboxPage/index.tsx
npm run build
```

ถ้าแก้ interaction ควรทดสอบใน browser:

- drag card
- resize card
- collapse/expand
- close card
- duplicate/delete
- click card ที่ซ้อนกันแล้ว card นั้นขึ้นบนสุด
- pan board ด้วย mouse drag
- wheel zoom
- refresh แล้ว layout ยังอยู่
- Reset แล้วกลับ default

## Known Gotchas

- Layout ถูกจำใน `localStorage` ดังนั้นการเพิ่ม default card ใหม่ใน `initialCards` จะไม่แสดงให้ผู้ใช้ที่มี layout เก่า จนกว่าจะ Reset หรือ clear storage
- ถ้าเพิ่ม `SandboxCardKind` แต่ลืมเพิ่มใน `CARD_KINDS` ของ storage state ที่ persist อาจโหลดไม่ได้
- Widget ที่มี scroll ภายในควรครอบด้วย `data-sandbox-card-scroll="true"` เพื่อไม่ให้ wheel zoom ไป intercept การ scroll ใน card
- Card root ต้องมี `data-sandbox-card="true"` เพื่อให้ pan board ไม่เริ่มตอนกดบน card
- Card ที่ต้องแชร์ filter ควรใช้ `filterGroupId` เดียวกัน; ถ้าต้องแยก site/date ให้เลือกคนละสีบน titlebar และใช้ `filters` card ของสีนั้นเป็นตัวตั้งค่า
- API polling หนักควรมี `enabled` flag และเปิดเฉพาะ variant ที่ใช้อยู่
- อย่าใส่ business logic หนา ๆ ลง `CardSandboxPage`; ให้ทำ adapter component ใน feature folder
