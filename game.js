class SpaceInvaders {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        this.keys = {};
        this.lastTime = 0;
        
        this.player = {
            x: this.width / 2 - 20,
            y: this.height - 60,
            width: 40,
            height: 30,
            speed: 5
        };
        
        this.bullets = [];
        this.invaderBullets = [];
        this.invaders = [];
        this.particles = [];
        
        this.invaderSpeed = 1;
        this.invaderDirection = 1;
        this.invaderDropDistance = 20;
        this.lastInvaderShot = 0;
        this.invaderShootDelay = 1000;
        
        this.init();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    init() {
        this.createInvaders();
        this.updateHUD();
    }
    
    createInvaders() {
        this.invaders = [];
        const rows = 5;
        const cols = 10;
        const invaderWidth = 30;
        const invaderHeight = 20;
        const spacing = 10;
        const startX = (this.width - (cols * (invaderWidth + spacing))) / 2;
        const startY = 50;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this.invaders.push({
                    x: startX + col * (invaderWidth + spacing),
                    y: startY + row * (invaderHeight + spacing),
                    width: invaderWidth,
                    height: invaderHeight,
                    alive: true,
                    type: row < 2 ? 'small' : row < 4 ? 'medium' : 'large'
                });
            }
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.shoot();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
            this.draw();
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        this.updatePlayer();
        this.updateBullets();
        this.updateInvaders(deltaTime);
        this.updateInvaderBullets();
        this.updateParticles();
        this.checkCollisions();
        this.checkGameState();
    }
    
    updatePlayer() {
        if (this.keys['ArrowLeft'] && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] && this.player.x < this.width - this.player.width) {
            this.player.x += this.player.speed;
        }
    }
    
    updateBullets() {
        this.bullets = this.bullets.filter(bullet => {
            bullet.y -= 8;
            return bullet.y > 0;
        });
    }
    
    updateInvaders(deltaTime) {
        let shouldDrop = false;
        const aliveInvaders = this.invaders.filter(inv => inv.alive);
        
        if (aliveInvaders.length === 0) return;
        
        for (let invader of aliveInvaders) {
            invader.x += this.invaderSpeed * this.invaderDirection;
            
            if (invader.x <= 0 || invader.x >= this.width - invader.width) {
                shouldDrop = true;
            }
        }
        
        if (shouldDrop) {
            this.invaderDirection *= -1;
            for (let invader of aliveInvaders) {
                invader.y += this.invaderDropDistance;
            }
        }
        
        if (Date.now() - this.lastInvaderShot > this.invaderShootDelay) {
            this.invaderShoot();
            this.lastInvaderShot = Date.now();
        }
    }
    
    updateInvaderBullets() {
        this.invaderBullets = this.invaderBullets.filter(bullet => {
            bullet.y += 4;
            return bullet.y < this.height;
        });
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 2;
            particle.alpha = particle.life / 100;
            return particle.life > 0;
        });
    }
    
    shoot() {
        this.bullets.push({
            x: this.player.x + this.player.width / 2 - 2,
            y: this.player.y,
            width: 4,
            height: 10
        });
    }
    
    invaderShoot() {
        const aliveInvaders = this.invaders.filter(inv => inv.alive);
        if (aliveInvaders.length === 0) return;
        
        const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
        this.invaderBullets.push({
            x: shooter.x + shooter.width / 2 - 2,
            y: shooter.y + shooter.height,
            width: 4,
            height: 10
        });
    }
    
    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.invaders.length - 1; j >= 0; j--) {
                const invader = this.invaders[j];
                
                if (invader.alive && this.isColliding(bullet, invader)) {
                    invader.alive = false;
                    this.bullets.splice(i, 1);
                    
                    this.createExplosion(invader.x + invader.width / 2, invader.y + invader.height / 2);
                    
                    const points = invader.type === 'small' ? 30 : invader.type === 'medium' ? 20 : 10;
                    this.score += points;
                    this.updateHUD();
                    break;
                }
            }
        }
        
        for (let i = this.invaderBullets.length - 1; i >= 0; i--) {
            const bullet = this.invaderBullets[i];
            
            if (this.isColliding(bullet, this.player)) {
                this.invaderBullets.splice(i, 1);
                this.lives--;
                this.updateHUD();
                this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
                
                if (this.lives <= 0) {
                    this.gameState = 'gameOver';
                    this.showGameOver();
                }
            }
        }
        
        const aliveInvaders = this.invaders.filter(inv => inv.alive);
        for (let invader of aliveInvaders) {
            if (invader.y + invader.height >= this.player.y) {
                this.gameState = 'gameOver';
                this.showGameOver();
                break;
            }
        }
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 100,
                alpha: 1,
                color: `hsl(${Math.random() * 60 + 15}, 100%, 50%)`
            });
        }
    }
    
    checkGameState() {
        const aliveInvaders = this.invaders.filter(inv => inv.alive);
        if (aliveInvaders.length === 0) {
            this.level++;
            this.invaderSpeed += 0.5;
            this.invaderShootDelay = Math.max(500, this.invaderShootDelay - 100);
            this.createInvaders();
            this.updateHUD();
        }
    }
    
    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.drawStars();
        this.drawPlayer();
        this.drawBullets();
        this.drawInvaders();
        this.drawInvaderBullets();
        this.drawParticles();
    }
    
    drawStars() {
        this.ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 137.5) % this.width;
            const y = (i * 173) % this.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
    }
    
    drawPlayer() {
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        this.ctx.fillStyle = '#00aa00';
        this.ctx.fillRect(this.player.x + 5, this.player.y - 5, 30, 10);
        this.ctx.fillRect(this.player.x + 15, this.player.y - 10, 10, 5);
    }
    
    drawBullets() {
        this.ctx.fillStyle = '#ffff00';
        for (let bullet of this.bullets) {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
    }
    
    drawInvaders() {
        for (let invader of this.invaders) {
            if (!invader.alive) continue;
            
            const colors = {
                'small': '#ff0000',
                'medium': '#ff8800',
                'large': '#ffff00'
            };
            
            this.ctx.fillStyle = colors[invader.type];
            this.ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(invader.x + 5, invader.y + 5, 4, 4);
            this.ctx.fillRect(invader.x + invader.width - 9, invader.y + 5, 4, 4);
        }
    }
    
    drawInvaderBullets() {
        this.ctx.fillStyle = '#ff0000';
        for (let bullet of this.invaderBullets) {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
    }
    
    drawParticles() {
        for (let particle of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x, particle.y, 3, 3);
            this.ctx.restore();
        }
    }
    
    updateHUD() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
    }
    
    showGameOver() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'block';
    }
}

let game;

function startGame() {
    game = new SpaceInvaders();
}

function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    startGame();
}

window.addEventListener('load', startGame);