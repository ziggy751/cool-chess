const castRows=[
 ['Badge','rook','mint','caseworker'],['Kev-9','robot','orange','trainee'],['Kanga Max','hare','gold','shopper'],
 ['Nibs','bird','cyan','operator'],['The Binspector','ibis','cream','health inspector'],['Eject','appliance','red','toaster'],
 ['Cold Unit','appliance','cyan','refrigerator'],['Mic Rowan','appliance','lilac','microwave'],['Spud','potato','gold','host'],
 ['Chips','potato','red','producer'],['Waddle','bird','lilac','weatherman'],['Sweep','robot','mint','janitor'],
 ['Orbit','helmet','cyan','astronaut'],['Comet','helmet','rose','geologist'],['The L','knight','cream','grandmaster'],
 ['En Passant','pawn','mint','supermarket mayor'],['Capy Byte','potato','peach','streamer'],['Crate 09','crate','red','inventory clerk'],
 ['Forklift Fred','robot','gold','forklift operator'],['Dr Squeak','mouse','mint','researcher'],['Squeak Jr','mouse','lilac','lawyer'],
 ['Conductor Zero','helmet','cream','train conductor'],['Pip','elf','mint','gift wrapper'],['The Golden Bell','bell','gold','shop manager'],
 ['Left Sock','blob','cyan','accountant'],['Right Sock','blob','rose','detective'],['Door 4','crate','mint','doorman'],
 ['Receipt','scroll','cream','witness'],['Captain Get-In','cart','cyan','racing driver'],['Aisle Six','cart','gold','clerk'],
 ['Councillor Quack','duck','gold','judge'],['Big Quack','duck','rose','stadium announcer'],['Dusty','hare','peach','mechanic'],
 ['Vanne','helmet','orange','bike technician'],['Beeps','robot','lilac','arcade boss'],['Dale','ibis','rose','security chief'],
 ['Jelly-100','blob','lilac','archivist'],['Pearl','mouse','cyan','diver'],['Crowbar','rook','red','castle guard'],
 ['Pixel','crate','lilac','game character'],['Lantern','bell','orange','night guard'],['Charlie','duck','mint','court reporter'],
 ['Byte Mark','elf','cyan','sound engineer'],['Laneway','ibis','cream','traffic reporter'],['Plywood','pawn','gold','builder'],
 ['Signal','helmet','mint','radio engineer'],['Director Salad','potato','mint','film director'],['Toastie','appliance','peach','cafe owner'],
 ['Bandaid','blob','orange','physicist'],['Canteen','scroll','cyan','mission controller'],
]
export const cast=Object.fromEntries(castRows.map(([name,shape,color,role],id)=>[id,{id,name,shape,color,role,voice:id%20}]))
export const colors={mint:'#7cdcb6',orange:'#ef9c56',gold:'#ebc470',cyan:'#75c9e8',cream:'#f0dfb4',red:'#e66f70',lilac:'#ad9aed',rose:'#f599bb',peach:'#e7a996'}

const stageRows=[
 ['Jovian Research Lab','lab','#152738','#eca068'],['Checkout 4','shop','#254137','#8cffac'],['Tape Room','studio','#362c46','#ff9ccb'],
 ['Orbital Dock','space','#101e3e','#84cafa'],['Sunken City Hall','water','#123638','#66e4cc'],['Accounts, Level 12','office','#283838','#c6df9c'],
 ['Hyper Burger','shop','#502b30','#ff835f'],['Dusty Roadhouse','desert','#4b3237','#eabb69'],['Courtroom 0','court','#392c35','#efd0a2'],
 ['Boardroom Arena','arena','#252d48','#8ad8fb'],['Channel Negative One','studio','#213748','#93d8ff'],['Dune Research Unit','desert','#543634','#f1be72'],
 ['Respawn Lobby','arcade','#2e2451','#f292f9'],['Castle Maintenance','court','#34344a','#ccb4f0'],['Workshop North','winter','#263647','#efa9ad'],
 ['Sublevel D','lab','#263b3c','#73efb6'],['Mall After Closing','shop','#373447','#c4aafb'],['The Very Important House','office','#392f45','#f9ca97'],
 ['Municipal Floating Island','sky','#252c53','#dfbafa'],['The Moon Router Room','space','#202e50','#a0d6eb'],['Inspected Pantry','shop','#342f43','#daadf0'],
 ['Public Swimming Pool','water','#163747','#9ceafb'],['Frost Delivery Dock','winter','#26344a','#aeedec'],['Racing Control','track','#253242','#ffb874'],
 ['Black Box Archive','lab','#412e3b','#ff9b8d'],['Tropical Loading Bay','sky','#23433f','#ffbf78'],['Twelve-Bit Mountains','arcade','#2b2b51','#aaadfb'],
 ['Cycle Repair Booth','track','#443942','#a8edb8'],['Weather Bunker','studio','#223542','#e5d5a6'],['Interplanetary Platform 3','space','#2c254c','#c9adf7'],
]
export const stages=stageRows.map(([name,kind,base,light],id)=>({id,name,kind,base,light}))

const inventories={
 appliance:['Microwave','Toaster','Fridge','Router','Kettle','Fan','Desktop PC','Remote','Fax machine','Thermostat'],
 screen:['Radar','Race timer','Weather monitor','Leaderboard','Livestream','Terminal','Receipt scanner','Traffic panel','Arcade screen','Ticket display'],
 container:['Lunchbox','Cargo crate','Ice chest','Mailbox','Suggestion box','Cash drawer','Vacuum case','Time capsule','Snack cabinet','Toolbox'],
 paper:['Receipt','Permit','Report','Menu','Complaint','Map','Contract','Ticket','Opening notes','Maintenance log'],
 wheel:['Shopping trolley','Bicycle','Unicycle','Trailer','Office chair','Skateboard','Forklift','Scooter','Hospitality cart','Sled'],
 signal:['Doorbell','Traffic light','Satellite','Antenna','Microphone','Lighthouse','Beacon','Spotlight','Siren','Emergency button'],
 food:['Sandwich','Hot chips','Banana','Pie','Potato','Bread','Cheese','Pickle','Dumpling','Cereal'],
 trophy:['Pawn','Knight','Rook','Rubber duck','Medal','Globe','Crown','Trophy','Bell','Chess clock'],
 weather:['Snow globe','Moon','Cloud','Sun','Comet','Planet','Moon rock','Artificial wave','Lightning globe','Ice cube'],
 workshop:['Wrapping roll','Traffic cone','Cable reel','Wrench','Remote switch','Spanner','Snow brush','Paint roller','Stamp','Magnet'],
}
export const props=Object.entries(inventories).flatMap(([kind,items])=>items.map((name,variant)=>({name,kind,variant})))
export const propNamed=name=>props.find(prop=>prop.name===name)

const formats=[
 ['Classified Tape','vhs'],['Hard Cut','snap'],['Stadium Replay','sports'],['Emergency Bulletin','bulletin'],['Budget Documentary','film'],
 ['Security Monitor','security'],['Number Station','mono'],['Game Capture','pixel'],['Court Transcript','file'],['Live From the Desk','studio'],
 ['Lossy Upload','compression'],['Deep Archive','fried'],['Split Feed','split'],['Sublevel Feed','scanline'],['Field Report','letterbox'],
 ['Heat Camera','thermal'],['Motion Trigger','freeze'],['Camera Two','green'],['Route Replay','outline'],['Paper Record','paper'],
 ['On-Air Test','bars'],['Projection Booth','grain'],['Dispatch Feed','ticker'],['Night Scope','night'],['Highlights','vignette'],
]
export const editStyles=formats.map(([name,effect])=>({name,effect}))
export const cameras=[
 ['Medium',1,.05,0,0],['Witness',1.20,-.17,.10,0],['Counter',1.3,.20,.11,0],['Reveal',.94,.10,-.05,.08],
 ['Impact',1.20,-.07,.01,.36],['Long lens',1.51,-.10,.22,0],['Desk cam',1.10,0,.19,.03],
 ['Object camera',1.58,.20,-.05,.08],['Pull back',1.18,0,0,-.2],['Dutch',1.12,-.05,.03,.03,.12],
 ['Canted object',1.3,.16,.01,.11,-.12],['Wide dolly',.91,-.05,0,.16],['Close-in',1.27,.03,.15,.2],
 ['Behind glass',1.09,.09,-.08,0],['Low angle',1.19,.08,.19,.04],['Upper gantry',1.1,0,-.09,.03],
 ['Tight reaction',1.42,-.1,.14,.18],['Push past',1.09,.2,.04,.24],['Shallow pan',1.07,-.22,.05,0],
 ['Return pan',1.12,.24,.02,-.07],['Low-quality zoom',1.29,.06,0,.36],['Hallway',.83,0,.04,0],
 ['Narrow lens',1.16,.08,-.02,0],['Round up',1.03,0,.12,.17],['Quiet wide',.91,-.06,-.05,0],
 ['Object drop',1.18,.21,-.14,.18],['Front desk',1.22,-.08,-.02,0],['Broadcast',1.10,-.05,.07,.03],
 ['Shoulder mount',1.11,.03,.07,.04,-.05],['End slate',.88,0,.08,-.10],
].map(([name,zoom,x,y,push,roll=0])=>({name,zoom,x,y,push,roll}))
export const expressions=['deadpan','grin','alarm','squint','smirk','sleepy','gasp','suspicion','cheer','wince','doubt','scowl','curious','blank','relief','pout','shock','grimace','blink','laugh','side eye','dread','concentrate','impressed','pride','apology','confusion','joy','disbelief','whisper']
  .map((name,id)=>({name,eyes:[1,.7,1.4,.37,.82,.45][id%6],mouth:[-.2,.44,1,.1,.58,-.55,.7][id%7],brow:[0,-.4,.5,.2,-.3][Math.floor(id/2)%5],look:[0,0,2.4,-2.4,0][Math.floor(id/3)%5]}))
export const movements=['idle','snap','shuffle','shuffle backwards','sprint','tiptoe','moonwalk','stumble','pounce','bounce','levitate','float','vibrate','wobble','spin','swivel','step right','step left','land','drop','lean away','lean in','shiver','stretch','crouch','recoil','peek','nod','bow','point','wave','shake','flail','victory','drift','roll','rock','arm crank','march','slide','hop','jog','jitter','hush','deflate','squash','panic','double take','lower antenna','faint']
  .map((name,id)=>({name,speed:[.8,1.3,2,2.8,3.7][id%5],travel:[0,5,-6,16,-23,11,-15][id%7],lift:[1,7,4,18,11,2,0,8][id%8],twist:[.018,.08,-.05,.16,-.21,.30,-.10][Math.floor(id/2)%7],stretch:[0,.02,.04,.07,.12][Math.floor(id/3)%5]}))
export const voices=['Dry','Compressed','Nervous','Bright','Official','Lethargic','Whispered','Unruffled','Pitch-shifted','Measured','Rushed','Sleepy','Nasal','Eager','Weather desk','Baffled','Squeaky','Broadcaster','Mechanic','Synth']
  .map((name,id)=>({name,pitch:.56+(id%10)*.113,rate:.81+(id*7%11)*.045,delay:id%3*.095}))
// Each sound uses its own synthesizer parameters, shared envelopes and a short decay.
export const sounds=['Docket','Flashbulb','Fault','Brake','Tap','Case shut','Pop','Bass stamp','Error','Refused','Gavel','Printer','Alert','Wake','Verified','Receipt','Buzzer','Deadline','Thunk','Clang','Drop','Close-up','Blink','Wrong door','Crunch','Bonus','Scanner','Stereo click','Rubber stop','Panic','Pager','Low hit','Rubber duck','Coin','Overload','Emote','Delay','Barcode','Pressure','Bell','Nudge','Unlock','Next caller','Mallet','Ice crack','Subwoofer','Rewind','Sting','Transfer','Closing titles']
 .map((name,id)=>({name,frequency:75+id*19%621,end:34+id*43%430,type:['sine','triangle','square','sawtooth'][id%4],time:.08+id*11%37/105,noise:id*5%7/18}))
export const beds=['Vane','Overscan','Twelve-Bit','After Close','Orbit Loss','Teletext','Day Shift','Incomplete','Policy','Tilt','Ghost Light','Plasma','Hard Copy','Yellow Tag','Jingle Hold','The Outlet','Fog Line','Cold Dock','Rider','Three Minutes','Mains','Crate Shift','Gantry','Moon Test','Inspection']
 .map((name,id)=>({name,notes:[34+id%12,39+id*5%12,42+id*3%15,36+id*7%12],pace:.33+id%7*.079,wave:['sine','triangle','sawtooth'][id%3]}))

// Ordered entries are authored setup, turn, escalation, and payoff. The prop drives each story.
const scripts=[
 ['Jupiter Tape 04',0,'Microwave',[1,7,12],[13,15],'The microwave arrived from Jupiter.','Why is it set to one minute?','Every time it dings, Jupiter gets a little closer.','Turn it off. We’re about to be in leftovers.'],
 ['Incident at Register Four',1,'Receipt',[2,28],[27,5],'I paid for one banana.','Your tail scanned as a second customer.','It would like to split the payment.','Fine. Tell it to stop collecting points under my name.'],
 ['Hot Chip Tribunal',8,'Hot chips',[4,35],[30,32],'We recovered the empty chip carton.','My client claims it was always empty.','Then why is the carton calling him Dad?','Objection. That’s an entirely different family meal.'],
 ['Crate Lane Records',23,'Shopping trolley',[28,29],[38,43],'The trolley broke the lap record.','The track doesn’t go through the supermarket.','It does when the trolley locks all four wheels.','The trophy is in aisle six. Bring your own dollar.'],
 ['Tuesday Patch Notes',3,'Contract',[3,10],[8,9],'We added Tuesday on the last update.','That explains why it has no instructions.','It reset all previous Tuesdays to factory settings.','Good. I can finally return that overdue library book.'],
 ['Router on the Moon',19,'Router',[41,49],[12,21],'The Moon disconnected at nine.','Can we turn it off and on again?','We did. It came back as Tuesday.','Put it on guest Wi-Fi until it learns the calendar.'],
 ['Toaster Intro',6,'Toaster',[5,47],[33,46],'Show me the villain’s arrival.','He wants a full eleven seconds of smoke.','The entire building smells like breakfast.','Perfect. Get him an evil thin spread of butter.'],
 ['The Pawn’s First Day',9,'Pawn',[15,44],[0,14],'I’m running for retail mayor.','You’re a pawn. You can barely move.','I’ve doubled my first step just to impress the board.','Then promise us a diagonal supermarket exit.'],
 ['The Straight Knight',13,'Knight',[14,38],[0,40],'The knight refuses to move in an L.','What if we put the board on its side?','Now it refuses to move in a lowercase r.','Please stop changing the font. We’re all getting tired.'],
 ['Dispatch Misunderstanding',14,'Wrapping roll',[22,42],[23,40],'I wrapped the last present.','Is that our entire building?','The truck can’t leave. I wrapped the road, too.','At least the delivery estimate finally says next Christmas.'],
 ['Satellite Picnic',25,'Sandwich',[16,46],[41,19],'I dropped my sandwich on stream.','Why is it still rising?','It was buttered on both sides. Physics gave up.','Quick. Butter the camera so we can follow it.'],
 ['Grand Final Withdrawal',9,'Chess clock',[6,7],[14,43],'A fridge entered the tournament.','It held a draw for three hours.','Then it claimed the temperature advantage.','Disqualified. It brought a prepared opening and an ice tray.'],
 ['The Clean Room',15,'Wrench',[11,18],[19,48],'I put the lab back exactly as I found it.','That machine is facing yesterday.','It’s the only day I remember it facing.','Never mind. Tomorrow can take the blame.'],
 ['Extended Forecast',28,'Weather monitor',[10,43],[19,41],'Tomorrow’s chance of rain is a decimal.','How do you carry a decimal umbrella?','Below one, it rains upward.','We’ll have the floor forecast after the break.'],
 ['Draft Invoice',5,'Fax machine',[24,25],[27,17],'I sent the payment to the fax machine.','It says your invoice is chewing.','That’s its way of rejecting my signature.','Try signing as a large worm.'],
 ['Docket One',8,'Bell',[30,31],[20,43],'The court calls its next witness.','The bell would like to represent itself.','It intends to ring on its own behalf.','Strike that from the record. It’s getting ideas.'],
 ['Lost and Found',16,'Office chair',[26,39],[35,2],'A chair has been waiting for lost property.','Someone reported a missing person.','The chair wants to know who the person belongs to.','Tell it to stay seated. That part should be easy.'],
 ['Black Box Egg',24,'Time capsule',[36,49],[12,13],'The black box recording is a single squawk.','That is a very formal use of a rubber duck.','It had cleared the training simulator.','It passed with flying puddles.'],
 ['Canteen Inquiry',0,'Cheese',[12,13],[19,49],'We took a sample of Jupiter.','Explain why it pairs with crackers.','The rover says the crust is cheddar.','That planet is now in the catering budget.'],
 ['Faux Live',2,'Remote',[8,46],[9,33],'The director cut to a better angle.','That’s a different month.','He says Thursday is more flattering.','Someone turn down the Gregorian calendar.'],
 ['Forklift Certification',25,'Forklift',[18,3],[28,33],'I passed the forklift test.','You parked it on the answer sheet.','I was demonstrating precision stopping.','The answer sheet is now licensed to carry cargo.'],
 ['Arcade Appeal',12,'Leaderboard',[34,39],[16,46],'You entered three initials on the board.','They were a legally binding contract.','Every time someone beats me, I get a letter.','Please withdraw your high score. The mailman is exhausted.'],
 ['Parking at Sea Level',4,'Permit',[37,40],[30,11],'I’m here to renew my parking permit.','You drove your car here last year.','It’s been in the harbor ever since.','It can renew as a boat. That’s cheaper.'],
 ['Bike Shop Ruling',27,'Bicycle',[32,33],[34,41],'The bike makes a noise in third gear.','What kind of noise?','A polite request to see the manager.','It’ll get along with the bell. They can file together.'],
 ['Half-Time',23,'Race timer',[43,31],[28,29],'The timer went backwards through lap two.','That’s still a lap if you went around.','The judges are now younger than the driver.','We’re checking their birth certificates before the podium.'],
 ['Avalanche Delivery',22,'Ice chest',[42,23],[22,40],'Shipping says the ice chest is too cold.','What did we ship in it?','A smaller, angrier ice chest.','Print a second label for the attitude.'],
 ['Diagnostic',20,'Bread',[47,5],[11,7],'The toaster stops at the first slice.','It wants to know if that slice is a friend.','The second slice just came out as a witness.','Breakfast is adjourned until Tuesday.'],
 ['Hallway Report',17,'Vacuum case',[48,24],[25,26],'The vacuum went into a closed room.','Do we have a power cable long enough?','It pulled the entire mains socket with it.','Ask it to plug the house back in when it’s finished.'],
 ['Bullpen Call',10,'Microphone',[9,8],[46,31],'Our guest brought three microphones.','One is for me and one is for the producer.','The third is interviewing the other two.','We can fix this by giving it less airtime.'],
 ['Train Intercept',29,'Ticket',[21,26],[41,49],'The station printed a backwards ticket.','Does that mean we sit backwards?','Only the seat progresses toward the destination.','Please stand clear. The ticket is boarding now.'],
 ['Wall Sign',11,'Traffic light',[35,32],[33,40],'The traffic light is on a sandy wall.','Who stops for a red light in the desert?','The wind. It’s been waiting for twenty minutes.','Someone put a traffic cone under that dune.'],
 ['Floating Zoning Board',18,'Map',[36,44],[30,0],'A floating island applied for a street number.','It’s technically a roundabout for clouds.','The clouds hold a controlling interest.','Just bill it by altitude.'],
 ['Pipe Fitting',21,'Artificial wave',[37,19],[18,48],'There is a wrinkle in the pool.','Turn it inside out.','The deep end is now the inside pocket.','Fine. Put the lifeguard’s keys in it.'],
 ['Respawn Café',26,'Menu',[39,47],[16,34],'The menu offered unlimited legs.','It said level-ups.','Then explain why the table can run.','Tell it to pay before it leaves.'],
 ['Canteen, Take Two',7,'Pie',[32,2],[47,8],'The pie shop said the filling is seasonal.','Which season?','It started in summer and will finish loading in winter.','Cancel the fork. Bring me the loading bar.'],
 ['Rental Service',5,'Toolbox',[44,0],[48,24],'I logged the toolbox as borrowed.','It was logged as borrowing you.','It has a better credit rating.','Tell it the hammer is an authorized user.'],
]
const extraScripts=[
 ['Duplicate Lunch',20,'Lunchbox',24,11,'I packed the same lunch twice.','Why are both copies marked original?','One has been appealing the other’s sandwich licence.','Give them half a pickle each. We’re in mediation.'],
 ['Delivery in Geostationary',3,'Cargo crate',12,21,'I ordered next-day delivery to the station.','The package has been orbiting us since June.','It only goes out for delivery when we overtake it.','Please send the tracking number to the propulsion desk.'],
 ['A Very Small Meteor',0,'Moon rock',13,19,'It looked like a small meteor on the radar.','That’s a single crouton.','It entered the atmosphere at soup velocity.','Seal the lab. We’re expecting a second course.'],
 ['The Mailbox Refuses',17,'Mailbox',26,27,'The mailbox sent us an undeliverable notice.','Who was it addressed to?','Itself, for refusing to accept mail.','Leave the keys in the letter slot. We’re changing the locks.'],
 ['Point Taken',8,'Traffic cone',30,20,'The traffic cone has called an expert witness.','It’s pointing directly at the defendant.','That’s its only available gesture.','Fine. Put the tip under oath.'],
 ['Receipt with Legs',1,'Receipt scanner',2,28,'My receipt walked away before I could read it.','Was it printed on the fast setting?','It sprinted past the basket carrying my change.','Ring up a refund under track and field.'],
 ['Dinner for a Router',19,'Menu',49,6,'Table eight says their meal won’t connect.','They ordered the Wi-Fi password.','The waiter wrote it on the side of a baked potato.','Tell them the butter is case-sensitive.'],
 ['Floating Fees',18,'Complaint',44,36,'The complaint says the view keeps moving.','Your house is on a floating island.','The island is charging us by the minute.','We didn’t open a window. It shouldn’t count as streaming.'],
 ['Desk Under Review',5,'Cash drawer',25,24,'The drawer is exactly five dollars short.','Did you look behind the till?','It’s five dollars tall and refuses to bend.','Withdraw the desk at its current height.'],
 ['List of Witnesses',8,'Contract',20,30,'How many witnesses do you have?','Six. They are listed alphabetically by sound.','The printer is first under Krrrk.','Tell it to print the verdict without interrupting.'],
 ['Driver Update',23,'Leaderboard',29,28,'The car installed its own driver.','Why is the seat still empty?','That driver only supports the keyboard.','Get in. The accelerator is now the letter J.'],
 ['Official Inspection',27,'Cable reel',33,34,'I put a reel on the back of the bike.','Now the bike gets longer as you ride.','It just overtook its own handlebars.','Stop pedaling. We’re about to owe the shop another wheel.'],
 ['Too Much Snow',22,'Snow brush',23,22,'I cleared the snow off the delivery truck.','Why is it falling inside the cab?','I cleared it from the top down.','Roll the driver out gently. He’s forming a snowball.'],
 ['New Broadcast Policy',10,'Siren',43,10,'A siren interrupted our emergency bulletin.','That is what the bulletin was for.','The siren says it has breaking news about our bulletin.','Let it finish. I want to know what we said.'],
 ['Fair Play',9,'Rook',0,38,'The rook moved itself while I looked away.','It says it was castling on its lunch break.','It’s three squares out of bounds and holding a sandwich.','Offer it a draw. It has no idea what either word means.'],
 ['Mic Check, Mic Check',2,'Microphone',42,46,'They asked for a microphone check.','Why did you write an actual cheque?','The mic didn’t accept contactless.','Cancel it before the boom operator tries to cash it.'],
 ['Revised Tides',4,'Artificial wave',37,36,'The city moved high tide to after lunch.','Did you notify the ocean?','It replied with a 40-foot wet signature.','Next time attach the minutes in small waves.'],
 ['Broken Daylight',28,'Sun',10,49,'The sun is running two minutes behind.','What happens if it loses ten more?','By noon we’ll be in yesterday’s weather again.','Great. I can take my washing in before the hail.'],
 ['Do Not Swivel',5,'Office chair',24,17,'The office chair rotates on its own.','How long has it been doing this?','Six years. It just asked for annual leave.','Only approve it if it takes the wheels home.'],
 ['Buzzer Round',12,'Emergency button',34,16,'The emergency button has a high score.','What’s it playing?','A staring competition with the safety inspector.','Unplug it. I’ve already seen level two.'],
 ['A Room of One’s Own',17,'Thermostat',48,26,'I set the thermostat to room temperature.','Which room?','It built a smaller room inside this one.','Open its tiny window. It’s demanding a breeze.'],
 ['Accidental Stop Motion',2,'Remote switch',42,46,'The remote paused the entire studio.','Why can the boom move?','I forgot to include it in the group booking.','Let it join before it spends our whole budget on movement.'],
 ['The Outback Fax',7,'Fax machine',32,35,'They faxed us directions to the roadhouse.','Those are the directions from inside it.','The printer already arrived.','Ask the printer to send us the way out.'],
 ['Hold My Kettle',20,'Kettle',47,5,'My kettle won’t stop whistling.','That’s a very accurate rendition of the menu.','It started taking requests at half past four.','Order the soup. It’s finally in the right key.'],
 ['Permit to Wink',13,'Permit',38,40,'My castle permit includes one wink a week.','Did you use it to get past the drawbridge?','The drawbridge winked first.','Write it up for unauthorized flirting with the moat.'],
 ['Potion Return',13,'Dumpling',40,38,'I returned the potion because it was solid.','That sounds like a dumpling.','It healed every person at my lunch table.','Charge it for the entire party, then.'],
 ['Tiny Government',4,'Stamp',36,30,'The seal of approval is missing.','Where did you last see the seal?','It stamped four fish and went to lunch.','Hold the vote until the fish finish drying.'],
 ['Aisle Echo',1,'Antenna',28,2,'Aisle six has a faint echo.','Can you repeat that?','The cereal already repeated it for me.','Tell it to stop advertising from there.'],
 ['Original Copy',24,'Report',36,49,'This report says it is itself a copy.','What do we do with the original?','It’s refusing to come out of the printer tray.','Let it cool down. It’s having a paper identity crisis.'],
 ['Button With a View',18,'Doorbell',44,31,'The doorbell comes with a sea view.','Why is it mounted on a cloud?','The first visitor rang from the opposite side.','Put a bell on the ground floor. Nobody can find it.'],
 ['Wrong Cabin',29,'Ticket display',21,45,'The ticket display allocated me seat zero.','There is no seat zero on this train.','It’s under seat one. The number is extremely literal.','Please leave a little room for my knees this time.'],
 ['Recurring Problem',15,'Terminal',11,19,'The terminal asked to restart the terminal.','Which terminal did it mean?','The train station is spinning clockwise.','Log that before it reaches the platform.'],
 ['Glow-in-the-Dark Pay',16,'Spotlight',39,35,'The spotlight wants overtime.','Did it work after closing?','It’s been following the manager home.','Tell payroll he’s only visible from the waist up.'],
 ['Microwave Speedrun',26,'Microwave',39,34,'I speedran heating my noodles.','That timer says minus one second.','I burned them before I put them in.','Submit the receipt to the leaderboard before you buy them.'],
 ['Frosted Evidence',22,'Ice cube',22,23,'The ice cube came with testimony.','We have room for one more witness.','It just melted into three conflicting statements.','Read them before the court calls a sponge.'],
 ['Basket Charter',25,'Shopping trolley',18,29,'The trolley applied for airline status.','It only has three working wheels.','It calls the fourth one hand luggage.','Clear the runway of grocery bags first.'],
 ['Bike Fitting',27,'Traffic panel',33,32,'The size guide puts me on a medium bike.','That bike has already sized you.','It’s ordered an extra-small rider and a taller bell.','Please return me in the original packaging.'],
 ['Camera Zero',2,'Livestream',46,16,'The backup camera is filming the camera.','Which camera is doing the filming?','I don’t know. They’ve both turned their microphones off.','Rate the silence as a satisfactory take and move on.'],
 ['Shopping Island',18,'Cereal',44,36,'We opened a cereal aisle on the floating island.','How do we transport a shopping trolley up there?','The cereal comes with one small cloud.','Put two in the cart. We can get home as well.'],
 ['Red Light Fined',11,'Traffic light',35,43,'The red light received a parking ticket.','Why is it facing the wrong way?','It’s been earning late fees from its own reflection.','Wave it through. It has to go earn change.'],
 ['Rent by the Hour',17,'Desktop PC',48,26,'The computer wants to rent an extra minute.','What does it need a minute for?','It’s waiting for the clock to finish updating.','Give it ninety seconds. Let it keep the change.'],
 ['Museum Display',24,'Medal',49,36,'The medal is upside down in its display.','Maybe the winner wore it that way.','The engraving says fifth place in backflips.','Turn the wall over. The medal is correct.'],
 ['Snack Regulations',6,'Snack cabinet',5,47,'The snack cabinet passed its weigh-in.','What division are we placing it in?','Heavy pantry, amateur shelf.','Make sure it brings its own crackers to the bout.'],
 ['The Third Drawer',5,'Maintenance log',25,24,'The maintenance log has an unnumbered page.','Check behind the third drawer.','That drawer is page four.','Put the desk in a binder before someone changes the index.'],
 ['Telescope Warranty',0,'Satellite',19,12,'The telescope shows only tiny planets.','Did you check its warranty?','The planets asked us not to zoom in so far.','Refund our close-up before they see their own paperwork.'],
 ['Blue Moon Training',19,'Moon',12,21,'The moon has enrolled in a training course.','What are its current qualifications?','It can be new or full with only one button.','Offer it part-time. It already knows what half means.'],
 ['Squeaky Wheel',27,'Scooter',34,33,'The scooter only squeaks at intersections.','Does it still come with a bell?','The bell is in a dispute with the wheel.','Have the tyre draw up a speaking schedule.'],
 ['Lane of Fame',23,'Race timer',31,28,'The scoreboard says the crowd won.','Did any fans get onto the track?','The front row finished a lap while doing the wave.','Give them one trophy to pass along.'],
 ['Null Conclusion',12,'Arcade screen',39,16,'I played the game on the wrong input.','What did you plug in?','A second arcade cabinet. They’re playing me.','Unplug us. I can only afford three lives.'],
 ['Cartographer on Hold',29,'Map',21,26,'The new map put every platform on hold.','How do I get from here to level two?','Wait for the lift music to spell out the stairs.','I already took the chorus. It was going down.'],
 ['Expedited Plant',14,'Paint roller',22,42,'I wrapped a present with wet paint.','Was it at least dry by the time you shipped it?','The courier left a red trail straight to the customer.','Call the next dozen deliveries a tour.'],
 ['Artificial Day Off',15,'Fan',11,48,'The fan asked for the Monday off.','Why Monday, specifically?','It only turns round twice on the weekend.','Put it on rotate duty and see if it comes back around.'],
 ['The Other Vault',3,'Toolbox',13,18,'Someone left a toolbox in the airlock.','Which side was it facing?','Every side now. It’s done two orbits.','Tell the screwdriver it’s on call outside.'],
 ['Guest Account',16,'Remote',26,39,'The remote control rented a sofa.','Did it pay for a furniture delivery?','The sofa arrived with a battery compartment.','Leave it on standby. We can’t afford a second couch.'],
 ['Water Feature',21,'Lighthouse',37,11,'The lighthouse has a leak.','Which side is the water coming from?','The light has been getting in through the keyhole.','Close the blinds before we get a flood of visibility.'],
 ['Late Checkmate',9,'Opening notes',14,15,'Those opening notes are for a closing ceremony.','At what point did you realize?','My opponent castled while wearing a graduation cap.','Let the bishop speak before we award a draw.'],
 ['Property Developer',18,'Crown',44,30,'I bought the island above the castle.','Which way does the driveway go?','It’s a right turn at the weather.','Build a carport under the next available Thursday.'],
 ['Camera Lunch Break',10,'Hot chips',43,4,'We interviewed a hot chip about its commute.','Did it complain about the traffic?','It says every day ends in a paper bag.','Cut to sport. We’re running out of vinegar.'],
 ['Deep End Review',21,'Receipt',37,36,'The pool just printed a receipt.','What did we buy?','An extra metre of deep end and half a lifeguard.','Return the metre. Keep the useful half.'],
 ['Small Delivery, Large Sled',22,'Sled',40,23,'The sleigh is only delivering one envelope.','Why does it need four drivers?','It’s addressed to the people pushing.','Send it internally next time. The hill is expensive.'],
 ['Underwater Queue',4,'Ticket display',37,19,'The queue has twenty minutes of oxygen.','Can we put that on the ticket display?','We did. The display inhaled it.','Skip number seven. It’s having a snack.'],
 ['Replacement Keyboard',26,'Desktop PC',39,34,'I lost the enter key during a game.','Did you finish the level?','I’m still in the options menu from last year.','Try the escape key carefully. There’s snow outside.'],
 ['Checkout Weather',1,'Weather monitor',2,4,'I asked the cash register for the forecast.','How much change did it give you?','One thunderstorm and ten little clouds.','Charge the rain to my rewards card.'],
 ['Missing Platform',29,'Map',21,45,'Platform three is gone from the map.','Did the printed copy have it?','It boarded the last train.','Next time put the buildings in checked baggage.'],
 ['Documentary Sandwich',7,'Sandwich',46,32,'The sandwich needs one more scene.','What is its character arc?','It moves from the plate to the lunchbox.','We can only afford to shoot the bread from one side.'],
]
for(const [title,stage,prop,lead,support,...lines] of extraScripts)
  scripts.push([title,stage,prop,[lead,support],[support,lead],...lines])

export const stories=scripts.map(([title,stage,prop,lead,support,...lines],id)=>({id,title,stage,prop:propNamed(prop) || propNamed('Bread'),lead,support,lines}))
