export const holidayEditions={
  'santa-shapes':{label:'Santa’s Workshop',parent:'carved',detail:'heritage',color:0xb94544,dark:0x42705b,pattern:'marble',motion:'snow',effect:'ribbon'},
  'gingerbread-set':{label:'Gingerbread Kingdom',parent:'samurai',detail:'ribs',color:0xc99063,dark:0x744131,pattern:'sugar',motion:'snow',effect:'crumb'},
  'frozen-noel':{label:'Frozen Christmas',parent:'frost',detail:'facets',color:0xc9e9f6,dark:0x548dba,pattern:'frost',glass:.36,motion:'globe',effect:'frost'},
  'christmas-gilt':{label:'Christmas Gold',parent:'gold',detail:'filigree',color:0xedbc64,dark:0x8899a1,pattern:'goldflow',metal:.87,motion:'lights',effect:'gold'},
  'candy-striped':{label:'Candy Cane',parent:'ceramic',detail:'ribs',color:0xffd9ca,dark:0x8ecabe,pattern:'peppermint',motion:'snow',effect:'crumb'},
  'twinkle-set':{label:'Christmas Lights',parent:'chrome',detail:'machined',color:0x626e91,dark:0x2c4146,pattern:'grid',metal:.64,motion:'lights',effect:'ribbon'},
  'snowglobe-set':{label:'Snow Globe',parent:'crystal',detail:'facets',color:0xe5f4f5,dark:0xa4c7d8,pattern:'frost',glass:.86,motion:'globe',effect:'frost'},
  'nutcracker-set':{label:'Nutcracker Royalty',parent:'mechanical',detail:'gear',color:0xab4239,dark:0x4b658c,pattern:'marble',motion:'mechanical',effect:'gold'},
}
for(const [id,edition] of Object.entries(holidayEditions)){
  edition.white=id
  edition.black=id+' dark'
  edition.category='Christmas'
}
export const holidayBoards={
  'festive-walnut':['#e3c990','#774637','#603829','wood','goldflow','Christmas Walnut'],
  'festive-crystal':['#c6eaf5','#597a97','#345471','marble','frost','Frozen Crystal'],
  'festive-ginger':['#e2b787','#935a42','#603625','stone','sugar','Gingerbread'],
  'festive-cane':['#ffe6d7','#a44951','#813042','marble','peppermint','Candy Cane'],
  'festive-lights':['#a8c7a4','#396254','#233b33','wood','ribbons','Christmas Lights'],
  'festive-globe':['#c8e1eb','#617e9d','#2c485f','marble','water','Snow Globe'],
}
