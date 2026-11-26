export class Online {
  constructor(onMessage) {
    this.onMessage = onMessage
    this.pending = []
    this.retry = 400
    this.identified = false
  }

  connect() {
    if (this.socket && this.socket.readyState < 2) return
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = this.socket = new WebSocket(protocol + '//' + location.host + '/socket')
    socket.onopen = () => {
      this.retry = 400
      this.identified = false
      this.onMessage({type:'connection',open:true})
      if (this.room) socket.send(JSON.stringify({type:'join', ...this.room}))
      for (const message of this.pending.splice(0)) socket.send(JSON.stringify(message))
      this.ping()
    }
    socket.onmessage = ({data}) => {
      const message = JSON.parse(data)
      if (message.type === 'profile') {
        this.identified = true
        localStorage.setItem('evolution-ranked-token',message.token)
      }
      if (message.type === 'joined') {
        const {code,token} = message
        this.room = {code, token, spectate:!token}
        if (token) sessionStorage.setItem('chess-room-' + code,token)
      }
      if (message.type === 'expired') this.room = null
      this.onMessage(message)
    }
    socket.onclose = event => {
      if (this.socket !== socket) return
      this.onMessage({type:'connection',open:false,replaced:event.code===4000})
      if (event.code !== 4000 && (this.room || this.pending.length)) {
        this.reconnect = setTimeout(() => this.connect(), this.retry)
        this.retry = Math.min(this.retry * 2,8000)
      }
    }
  }

  send(message, queue = false) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
      return true
    }
    else if (queue) {
      this.pending.push(message)
      this.connect()
    } else this.onMessage({type:'error',action:message.type,message:'Still reconnecting. Please try again.'})
    return false
  }

  join(code,spectate = false) {
    const token = spectate ? null : sessionStorage.getItem('chess-room-' + code)
    this.send({type:'join',code,spectate,token},true)
  }

  withProfile(message) {
    const token = localStorage.getItem('evolution-ranked-token')
    if (!this.identified) this.send({type:'identify',token},true)
    this.send(message,true)
  }

  ping() {
    if (this.socket?.readyState === WebSocket.OPEN) this.send({type:'ping',stamp:performance.now()})
  }

  leave() {
    clearTimeout(this.reconnect)
    this.room = null
    this.pending = []
    if (this.socket?.readyState === WebSocket.OPEN) this.send({type:'leave'})
  }
}
