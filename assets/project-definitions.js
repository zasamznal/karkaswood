// Length is the X axis, width is the Z axis, and the front is at +Z.
// Height and eaves are measured from the ground. With a porch, "at" runs
// along the enclosed wall only. Unpublished dimensions below are visual estimates.
//
// furniture — условная расстановка: показывает назначение помещений (см. furnitureKit в project-geometry.js).
// rooms     — подписи на плане и в разрезе, x и z — точка подписи.
// lamps     — фасадные светильники: wall, at (доля длины стены), y (высота над полом).
export const projectDefinitions = {
  'scandinavia-3-5': {
    length: 5, width: 3, height: 2.83, eaves: 2.66, roof: 'shed',
    wall: '#424653', trim: '#eae8dc', roofColor: '#61636a', cladding: 'vertical',
    front: 'long', cameraYaw: -0.78,
    features: [
      {wall:'front', kind:'glazed', at:0.34, width:0.86, height:2.04, sill:0, trim:'#eeeae3'},
      {wall:'left', kind:'panorama', at:0.5, width:1.93, height:1.65, sill:0.4, trim:'#eeeae3'},
    ],
    chimney: {x:1.2,z:-1.02},
    partitions: [
      {x:-0.27,z:-0.33,length:2.15,axis:'z'},
      {x:0.82,z:-0.33,length:2.15,axis:'z'},
    ],
    furniture: [
      {type:'stove', x:1.2, z:-1.02},
      {type:'bench', axis:'z', x:2.1, z:-0.35, length:2.0, depth:0.56, tiers:2, step:-1, stepDepth:0.36},
      {type:'shower', x:0.28, z:-0.95},
      {type:'heater', x:-1.5, z:-1.24},
      {type:'seat', x:-1.5, z:-1.15, length:1.4, back:-1},
      {type:'table', x:-1.5, z:-0.5, length:1.0, depth:0.6},
    ],
    rooms: [{name:'Комната отдыха',x:-1.35,z:0.6},{name:'Мойка',x:0.28,z:0.3},{name:'Парная',x:1.45,z:0.85}],
    note: 'Габариты бани — 3 × 5 м. Высота, проёмы и границы парной, мойки и комнаты отдыха показаны ориентировочно, мебель и печь — условно.',
  },
  'barn-compact': {
    length: 3, width: 2.4, height: 2.53, eaves: 2.24, roof: 'gable',
    wall: '#44474b', trim: '#33363b', roofColor: '#3a3c42', cladding: 'metal',
    wallColors: {left:'#c4a477'}, claddings: {left:'vertical'},
    front: 'end', cameraYaw: -1.21,
    features: [{wall:'left', kind:'double', at:0.5, width:1.1, height:1.8, sill:0, color:'#c9af82', trim:'#b59b70'}],
    furniture: [{type:'shelves', axis:'z', x:1.16, z:0, length:2.0, depth:0.42, levels:4}],
    rooms: [{name:'Хранение',x:-0.25,z:0}],
    note: 'Двустворчатые двери имеют размер 1,1 × 1,8 м. Высота конька и глубина обрамления показаны по фотографиям, стеллаж — условно.',
  },
  'workshop-3-4': {
    length: 4, width: 3, height: 2.84, eaves: 2.25, roof: 'gable',
    wall: '#a56740', trim: '#835436', roofColor: '#583d3c', cladding: 'horizontal',
    front: 'long', cameraYaw: 0.48,
    features: [
      {wall:'front', kind:'door', at:0.20, width:0.8, height:1.8, sill:0, color:'#9b643f', trim:'#815034'},
      {wall:'front', kind:'window', at:0.79, width:0.8, height:0.8, sill:0.97, trim:'#efece3'},
    ],
    furniture: [
      {type:'workbench', x:1.1, z:1.06, length:1.5, depth:0.6},
      {type:'stool', x:1.1, z:0.45},
      {type:'shelves', x:-0.75, z:-1.16, length:2.1, depth:0.42, levels:4},
    ],
    rooms: [{name:'Мастерская',x:0,z:-0.1}],
    note: 'Производитель указал дверь 0,8 × 1,8 м и окно 0,8 × 0,8 м. Высота постройки и размещение проёмов оценены по снимкам, верстак и стеллаж показаны условно.',
  },
  'loft-woodstore': {
    length: 7, width: 2.2, height: 2.61, eaves: 2.42, roof: 'shed',
    wall: '#464b50', trim: '#42474e', roofColor: '#44474b', cladding: 'metal',
    wallColors: {front:'#c59d70',left:'#ba956b'}, claddings: {front:'horizontal',left:'horizontal'},
    front: 'long', cameraYaw: -0.72,
    features: [{wall:'front',kind:'door',at:0.22,width:0.8,height:1.8,sill:0,color:'#3d4145',trim:'#393d41'}],
    lamps: [{wall:'front',at:0.115},{wall:'front',at:0.325}],
    terrace: {end:'left',length:1.65,style:'slats'},
    furniture: [
      {type:'firewood', x:-2.68, z:-0.72, length:1.45, depth:0.5, height:1.35},
      {type:'shelves', x:1.75, z:-0.77, length:3.0, depth:0.42, levels:4},
    ],
    rooms: [{name:'Дровник',x:-2.68,z:0.3},{name:'Инвентарь',x:0.9,z:0.15}],
    note: 'Общая длина с дровником — 7 м. Высота, длина открытого отсека и шаг реек оценены по фотографиям, поленница и стеллаж показаны условно.',
  },
  'bath-panoramic': {
    length: 8, width: 2.5, height: 2.91, eaves: 2.77, roof: 'shed',
    wall: '#ad763f', trim: '#e9e9e0', roofColor: '#535254', cladding: 'vertical',
    front: 'long', cameraYaw: 0.69,
    features: [
      {wall:'left',kind:'window',at:0.49,width:0.36,height:0.36,sill:1.58,trim:'#edece0'},
      {wall:'front',kind:'window',at:0.44,width:0.38,height:0.43,sill:1.37,trim:'#edece0'},
      {wall:'front',kind:'panorama',at:0.672,width:0.64,height:1.93,sill:0.15,trim:'#ecebe4'},
      {wall:'front',kind:'glazed',at:0.782,width:0.87,height:2.12,sill:0,trim:'#ecebe4'},
      {wall:'front',kind:'panorama',at:0.894,width:0.65,height:1.94,sill:0.15,trim:'#ecebe4'},
      {wall:'right',kind:'panorama',at:0.50,width:1.96,height:1.93,sill:0.16,trim:'#ecebe4'},
    ],
    chimney: {x:-1.75,z:-0.72},
    partitions: [
      {x:-1.32,z:-0.35,length:1.63,axis:'z'},
      {x:0.10,z:-0.35,length:1.63,axis:'z'},
    ],
    furniture: [
      {type:'bench', axis:'z', x:-3.6, z:0, length:2.24, depth:0.56, tiers:2, step:1, stepDepth:0.36},
      {type:'bench', x:-2.5, z:-0.92, length:0.8, depth:0.42},
      {type:'stove', x:-1.75, z:-0.72},
      {type:'shower', x:-0.85, z:-0.72},
      {type:'bucket', x:-0.28, z:-0.25},
      {type:'heater', x:-0.28, z:-0.99, length:0.6},
      {type:'seat', x:2.6, z:-0.93, length:1.8, back:-1},
      {type:'table', x:2.6, z:-0.32, length:1.2, depth:0.6},
    ],
    rooms: [{name:'Парная',x:-2.45,z:0.5},{name:'Душевая',x:-0.6,z:0.6},{name:'Комната отдыха',x:1.55,z:0.45}],
    note: 'Три панорамных окна показаны по фотографиям. Высота, размеры проёмов и границы помещений ориентировочные, мебель и печь — условно.',
  },
  'provence-garden': {
    length: 4.8, width: 2.4, height: 2.66, eaves: 2.32, roof: 'gable',
    wall: '#d2bd7e', trim: '#eee8da', roofColor: '#533c37', cladding: 'vertical',
    front: 'long', cameraYaw: 0.53,
    features: [
      {wall:'front',kind:'window',at:0.255,width:0.49,height:0.79,sill:0.88,trim:'#eeeae0',planter:true,planterColor:'#eeeae0'},
      {wall:'front',kind:'double',at:0.66,width:1.2,height:1.8,sill:0,color:'#cdb675',trim:'#eee8da'},
      {wall:'right',kind:'window',at:0.5,width:0.47,height:0.77,sill:0.91,trim:'#eeeae0',planter:true,planterColor:'#eeeae0'},
    ],
    furniture: [{type:'shelves', x:-0.9, z:-0.97, length:2.6, depth:0.42, levels:4}],
    rooms: [{name:'Хранение',x:0.3,z:0.05}],
    note: 'Дверь — 1,2 × 1,8 м. Два окна и кашпо показаны по снимкам, их размеры и высота постройки ориентировочные, стеллаж — условно.',
  },
  'bath-terrace': {
    length: 7, width: 6.4, height: 2.82, roof: 'flat',
    wall: '#ad7645', trim: '#424448', roofColor: '#414347', cladding: 'horizontal',
    front: 'long', cameraYaw: -0.60, features: [],
    compound: {
      // Bath and storage meet at the inner corner. Each entrance faces the open deck.
      parts: [
        {x:-1,z:-2,rotationY:0,definition:{
          length:5,width:2.4,height:2.82,eaves:2.68,roof:'shed',
          wall:'#494c4f',trim:'#414347',roofColor:'#454346',cladding:'metal',
          wallColors:{front:'#b2814c',left:'#45474b'},claddings:{front:'horizontal'},
          front:'long',steps:false,features:[
            {wall:'front',kind:'window',at:0.26,width:0.76,height:0.89,sill:0.89,trim:'#3c3d41'},
            {wall:'front',kind:'glazed',at:0.76,width:0.84,height:1.97,sill:0,trim:'#36393e'},
          ],
          terrace:{end:'left',length:1.64,style:'slats'},
          chimney:{x:0.6,z:-0.75},
          partitions:[{x:1.0,z:-0.37,length:1.45,axis:'z'}],
          furniture:[
            {type:'stove',x:0.6,z:-0.75},
            {type:'bench',axis:'z',x:-0.46,z:0,length:2.1,depth:0.56,tiers:2,step:1,stepDepth:0.34},
            {type:'seat',axis:'z',x:2.17,z:-0.3,length:1.4,back:1},
            {type:'firewood',x:-1.68,z:-0.85,length:1.3,depth:0.5,height:1.25},
          ],
        }},
        {x:2.5,z:1.2,rotationY:Math.PI/2,definition:{
          length:4,width:2,height:2.73,eaves:2.61,roof:'shed',
          wall:'#45474a',trim:'#3e4144',roofColor:'#444347',cladding:'metal',
          wallColors:{back:'#af7946'},claddings:{back:'horizontal'},
          front:'long',steps:false,features:[
            {wall:'back',kind:'door',at:0.35,width:0.8,height:1.90,sill:0,color:'#393b42',trim:'#37393c'},
          ],
          terrace:{end:'left',length:0.78,style:'slats'},
          furniture:[{type:'shelves',x:0.39,z:0.66,length:2.8,depth:0.42,levels:4}],
        }},
      ],
      decks: [{x:-1,z:1.2,length:5,width:4}],
    },
    rooms: [{name:'Парная',x:-0.95,z:-1.7},{name:'Предбанник',x:0.72,z:-1.7},{name:'Навес',x:-2.68,z:-1.55},{name:'Хозблок',x:2.5,z:0.8},{name:'Терраса 5 × 4 м',x:-1,z:1.2}],
    note: 'Баня 2,4 × 5 м и хозблок 2 × 4 м выходят на террасу 5 × 4 м. Высота, ниши и перегородки показаны приблизительно, мебель и печь — условно.',
  },
  'loft-garden': {
    length: 4, width: 2, height: 2.51, eaves: 2.37, roof: 'shed',
    wall: '#4a4c4b', trim: '#383d41', roofColor: '#414548', cladding: 'metal',
    wallColors:{front:'#a96937'},claddings:{front:'horizontal'},
    front: 'long', cameraYaw: 0.48,
    features: [
      {wall:'front',kind:'door',at:0.44,width:0.8,height:1.8,sill:0,color:'#3c4143',trim:'#383d40'},
      {wall:'front',kind:'window',at:0.595,width:0.3,height:1.8,sill:0.05,trim:'#383d40'},
    ],
    lamps: [{wall:'front',at:0.17},{wall:'front',at:0.83}],
    furniture: [
      {type:'shelves', axis:'z', x:-1.67, z:0, length:1.6, depth:0.42, levels:4},
      {type:'shelves', x:1.0, z:-0.67, length:1.6, depth:0.42, levels:3, height:1.4},
    ],
    rooms: [{name:'Инвентарь',x:0,z:0.15}],
    note: 'Узкое окно 0,3 × 1,8 м стоит справа от двери. Высота крыши и положение проёмов оценены по фотографиям, стеллажи показаны условно.',
  },
  'barn-maxi': {
    length: 5, width: 2.4, height: 3.5, eaves: 2.28, roof: 'gable', ridgeAxis:'z',
    wall: '#303132', trim: '#ac8254', roofColor: '#2e2e2e', cladding: 'metal',
    wallColors:{front:'#ca985d'},claddings:{front:'vertical'},
    front:'long',cameraYaw:-0.55,
    features:[
      {wall:'front',kind:'window',at:0.23,width:0.6,height:0.4,sill:1.53,trim:'#b48a56'},
      {wall:'front',kind:'double',at:0.5,width:1.2,height:1.8,sill:0,color:'#c5955b',trim:'#b9915e'},
      {wall:'front',kind:'window',at:0.77,width:0.6,height:0.4,sill:1.53,trim:'#b48a56'},
    ],
    lamps: [{wall:'front',at:0.345,y:1.5},{wall:'front',at:0.655,y:1.5}],
    furniture: [
      {type:'shelves', axis:'z', x:-2.17, z:0, length:2.0, depth:0.42, levels:5, height:2.1},
      {type:'shelves', axis:'z', x:2.17, z:0, length:2.0, depth:0.42, levels:5, height:2.1},
    ],
    rooms: [{name:'Хранение',x:0,z:-0.1}],
    note: 'Высота в коньке — 3,5 м, оба окна — 0,6 × 0,4 м. Их положение и высота боковых стен оценены по фотографиям, стеллажи показаны условно.',
  },
};
