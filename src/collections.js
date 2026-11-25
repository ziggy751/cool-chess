import { immersiveEditions } from './worlds/chess-editions.js'

// Cross-section of the weighted foot, in radius/height units. The vertical
// and radial offsets define the waist and shoulders of each turned body.
const collections = {
  staunton: ['Traditional Staunton', [[.33,.025],[.36,.055],[.355,.09],[.34,.12],[.30,.135],[.29,.16]], [0,0,0],64],
  carved: ['Carved walnut', [[.35,.02],[.375,.055],[.365,.10],[.33,.12],[.34,.147],[.30,.169]], [.038,-.024,.014],72],
  chrome: ['Polished chrome', [[.35,.012],[.365,.031],[.365,.061],[.31,.082],[.30,.146],[.28,.172]], [-.02,.037,.064],72],
  obsidian: ['Black obsidian', [[.32,.015],[.36,.043],[.36,.082],[.32,.143],[.28,.146],[.255,.164]], [.035,-.031,-.026],12],
  marble: ['White marble', [[.33,.027],[.36,.055],[.36,.09],[.353,.119],[.29,.154],[.263,.17]], [.019,.029,-.033],72],
  gold: ['Solid gold', [[.35,.014],[.37,.039],[.354,.060],[.366,.08],[.322,.122],[.31,.164]], [.048,.001,.053],72],
  glass: ['Transparent glass', [[.33,.01],[.36,.041],[.37,.082],[.33,.122],[.27,.14],[.26,.168]], [-.033,.043,-.018],72],
  crystal: ['Faceted crystal', [[.32,.005],[.36,.047],[.35,.091],[.31,.14],[.29,.158],[.26,.175]], [.06,.04,.033],9],
  stone: ['Medieval stone', [[.37,.012],[.37,.056],[.35,.072],[.35,.12],[.31,.137],[.31,.173]], [.059,.051,-.014],24],
  neon: ['Futuristic neon', [[.36,.011],[.37,.035],[.31,.096],[.33,.103],[.27,.114],[.26,.173]], [-.023,.011,.054],18],
  egyptian: ['Ancient Egyptian', [[.37,.012],[.36,.065],[.33,.08],[.32,.125],[.29,.139],[.28,.172]], [.009,.057,-.025],16],
  roman: ['Roman column', [[.34,.016],[.37,.031],[.37,.066],[.34,.076],[.34,.119],[.29,.16]], [.011,.064,.01],56],
  ceramic: ['Minimalist ceramic', [[.30,.012],[.34,.035],[.36,.089],[.34,.13],[.30,.162],[.27,.175]], [-.017,.077,.025],64],
  carbon: ['Carbon fibre', [[.35,.012],[.37,.030],[.37,.059],[.315,.080],[.315,.132],[.28,.164]], [.036,.026,-.003],32],
  holographic: ['Holographic', [[.31,.011],[.37,.029],[.37,.059],[.27,.089],[.29,.127],[.25,.171]], [.06,-.022,.061],20],
}

export const collectionList = Object.fromEntries(Object.entries(collections).map(([key,[label]])=>[key,label]))

export function profileFor(collection, profile, ring, base='classic') {
  const newProfiles = {
    titanium:['carbon',-.015,36],samurai:['egyptian',.031,32],molten:['stone',.023,18],
    frost:['crystal',-.035,11],nebula:['glass',.039,56],storm:['obsidian',-.024,16],
    mechanical:['chrome',.044,40],emerald:['crystal',.035,10],sapphire:['glass',-.02,12],
    phantom:['ceramic',-.03,50],celestial:['gold',.02,68],living:['marble',.03,64],
  }
  const edition=immersiveEditions[collection]
  const key=edition?.parent || collection
  const [parent,baseShift=0,segments] = newProfiles[key] || [key]
  const shift=baseShift+(edition?((collection.length%8)-3)*.011:0)
  const [,foot,[flare,waist,collar],sides] = collections[parent] || collections.staunton
  const bases = {
    bevel:[[.35,.015],[.37,.042],[.37,.079],[.30,.13],[.28,.17]],
    stepped:[[.37,.015],[.37,.057],[.325,.062],[.325,.115],[.28,.122],[.28,.17]],
    jewel:[[.27,.01],[.37,.045],[.36,.10],[.28,.16]],
  }
  const scaled = profile.map(([radius,height]) => {
    if (height > .92 || radius === 0) return [radius,height]
    const offset = height < .30 ? flare : height < .66 ? waist : collar
    return [radius+offset+Math.sin(height*7)*shift,height]
  })
  const styled=edition ? scaled.map(([radius,y])=>[radius*(1+Math.sin(y*19+collection.length)*.043),y]) : scaled
  return {
    points:[[0,0],[ring[1][0],0],...(bases[base] || foot),[.27,.175],...styled],
    sides:base==='jewel'?12:segments || sides,
  }
}

// The profile, crown treatment and surface are independent so they can also
// be selected on a single piece in the showroom.
const editions = {
  carved: ['Royal Walnut','walnut','ebony','heritage','timber'],
  marble: ['Italian Marble','marble','obsidian','fluted','stone'],
  chrome: ['Liquid Chrome','liquid chrome','dark chrome','machined','animated'],
  obsidian: ['Obsidian','crystal','obsidian','crenel','stone'],
  gold: ['Royal Gold','gold','dark chrome','filigree','metal'],
  crystal: ['Diamond Crystal','glass','crystal','facets','glass'],
  carbon: ['Carbon Edition','ceramic','carbon','machined','metal'],
  titanium: ['Black Titanium','chrome','titanium','ribs','metal'],
  ceramic: ['Porcelain','ceramic','ebony','fluted','stone'],
  roman: ['Ancient Roman','marble','walnut','fluted','stone'],
  stone: ['Medieval Royalty','stone','obsidian','crenel','stone'],
  egyptian: ['Egyptian Dynasty','gold','obsidian','obelisk','stone'],
  samurai: ['Samurai','rose gold','lacquer','helmet','timber'],
  neon: ['Cyberpunk','holographic','titanium','ribs','animated'],
  holographic: ['Holographic','holographic','midnight hologram','rings','animated'],
  molten: ['Molten Core','molten','obsidian','crenel','animated'],
  frost: ['Frozen Kingdom','frost','sapphire','facets','animated'],
  nebula: ['Nebula','nebula','obsidian','rings','animated'],
  storm: ['Storm Edition','storm','titanium','obelisk','animated'],
  mechanical: ['Mechanical','brass','titanium','gear','animated'],
  emerald: ['Emerald','emerald','obsidian','facets','glass'],
  sapphire: ['Sapphire','sapphire','titanium','helmet','glass'],
  phantom: ['Phantom','phantom','midnight hologram','fluted','animated'],
  celestial: ['Celestial','celestial','titanium','filigree','animated'],
  living: ['Living Marble','living marble','obsidian','heritage','animated'],
}
export const premiumCollections = Object.fromEntries(Object.entries(editions).map(([key,[label,white,black,detail,category]])=>
  [key,{label,white,black,detail,category}]))
Object.assign(premiumCollections,immersiveEditions)
Object.assign(collectionList,Object.fromEntries(Object.entries(premiumCollections).map(([key,item])=>[key,item.label])))

export const baseStyles = { classic:'Original', bevel:'Machined bevel', stepped:'Stepped plinth', jewel:'Faceted collar' }
