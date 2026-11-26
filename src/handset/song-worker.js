import {compose} from './song-composer.js'

self.onmessage=({data})=>{
  try{
    const {info,wave}=compose(data,progress=>self.postMessage({progress}))
    self.postMessage({info,wave},[wave])
  }catch(error){self.postMessage({error:error.message})}
}
