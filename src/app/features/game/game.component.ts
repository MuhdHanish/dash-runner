import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.component.html',
})
export class GameComponent implements AfterViewInit {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private width = 400;
  private height = 700;
  private gameOver = false;
  private baseSpeed = 2;
  private maxSpeed = 8;
  private speedIncrement = 0.002;
  private currentSpeed = this.baseSpeed;
  private score = 0;
  private highScore = 0;

  private bgSkyX = 0;
  private bgGroundX = 0;

  private bgSkySpeed = 0.2;
  private bgGroundSpeed = 1;

  private obstacleSpawnTimer = 0;
  private spawnCooldown = 90; // frames between spawns (~1.5s at 60fps)
  private maxObstacles = 3;

  private player = {
    x: 50,
    y: 600,
    width: 40,
    height: 40,
    vy: 0,
    jumping: false,
  };
  private gravity = 1;
  private obstacles: { x: number; y: number; width: number; height: number }[] =
    [];

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = this.width;
    canvas.height = this.height;

    window.addEventListener('keydown', this.handleInput.bind(this));
    this.loop();
    canvas.addEventListener('click', () => {
      if (this.gameOver) {
        this.resetGame();
      } else if (!this.player.jumping) {
        this.player.vy = -20;
        this.player.jumping = true;
      }
    });
    this.highScore = Number(localStorage.getItem('highScore')) || 0;
    this.player = {
      x: 50,
      y: this.height - 80,
      width: 28,
      height: 40,
      vy: 0,
      jumping: false,
    };
  }

  private handleInput(e: KeyboardEvent) {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && !this.player.jumping) {
      this.player.vy = -20;
      this.player.jumping = true;
    }
  }

  private update() {
    this.currentSpeed = Math.min(
      this.currentSpeed + this.speedIncrement,
      this.maxSpeed
    );
    this.player.vy += this.gravity;
    this.player.y += this.player.vy;

    if (this.player.y >= this.height - this.player.height) {
      this.player.y = this.height - this.player.height;
      this.player.jumping = false;
    }

    // Move obstacles
    this.obstacles.forEach((ob) => (ob.x -= this.currentSpeed));

    // Spawn new obstacles
    this.obstacleSpawnTimer++;
    const canSpawn =
      this.obstacleSpawnTimer >= this.spawnCooldown &&
      this.obstacles.length < this.maxObstacles;

    if (canSpawn) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
      this.spawnCooldown = Math.max(40, this.spawnCooldown - 0.2);
    }

    this.obstacles = this.obstacles.filter((ob) => ob.x + ob.width > 0);
    for (const ob of this.obstacles) {
      if (this.isColliding(this.player, ob)) {
        this.gameOver = true;
        return;
      }
    }
    this.score += this.currentSpeed * 0.1;

    this.bgSkyX -= this.bgSkySpeed;
    this.bgGroundX -= this.bgGroundSpeed;

    if (this.bgSkyX <= -this.width) this.bgSkyX = 0;
    if (this.bgGroundX <= -this.width) this.bgGroundX = 0;
  }

  private spawnObstacle() {
    const width = 24 + Math.random() * 16;
    const height = 40;
    this.obstacles.push({
      x: this.width,
      y: this.height - height,
      width,
      height,
    });
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Sky Layer
    this.ctx.fillStyle = '#38bdf8'; // light blue
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#bae6fd'; // lighter cloud layer
    this.ctx.fillRect(this.bgSkyX, 0, this.width, this.height / 2);
    this.ctx.fillRect(this.bgSkyX + this.width, 0, this.width, this.height / 2);

    // Ground Layer
    this.ctx.fillStyle = '#166534'; // green hills
    this.ctx.fillRect(this.bgGroundX, this.height - 60, this.width, 60);
    this.ctx.fillRect(
      this.bgGroundX + this.width,
      this.height - 60,
      this.width,
      60
    );

    /// Player (Jumper)
    const { x, y, width, height } = this.player;
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 8;

    const gradient = this.ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#0ea5e9'); // blue-500
    gradient.addColorStop(1, '#0284c7'); // blue-600

    this.ctx.fillStyle = gradient;
    this.roundRect(x, y, width, height, 12);
    this.ctx.restore();

    // Obstacles
    for (const ob of this.obstacles) {
      const obGradient = this.ctx.createLinearGradient(
        ob.x,
        ob.y,
        ob.x,
        ob.y + ob.height
      );
      obGradient.addColorStop(0, '#1e293b'); // slate-800
      obGradient.addColorStop(1, '#0f172a'); // slate-900
      this.ctx.fillStyle = obGradient;
      this.roundRect(ob.x, ob.y, ob.width, ob.height, 8);
    }
  }

  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private loop = () => {
    if (!this.gameOver) {
      this.update();
      this.draw();
      requestAnimationFrame(this.loop);
    } else {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('highScore', this.highScore.toFixed(0));
      }
      this.drawGameOver();
    }
  };

  private isColliding(player: any, obstacle: any): boolean {
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    );
  }

  private drawGameOver() {
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Game Over', this.width / 2, this.height / 2);
    this.ctx.font = '24px Arial';
    this.ctx.fillText('Tap to Restart', this.width / 2, this.height / 2 + 40);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Score: ${this.score.toFixed(0)}`, this.width / 2, 30);
    this.ctx.fillText(
      `High Score: ${this.highScore.toFixed(0)}`,
      this.width / 2,
      50
    );
  }

  private resetGame() {
    this.gameOver = false;
    this.player.y = this.height - this.player.height;
    this.player.vy = 0;
    this.player.jumping = false;
    this.obstacles = [];
    this.currentSpeed = this.baseSpeed;
    this.score = 0;
    this.bgSkyX = 0;
    this.bgGroundX = 0;
    this.loop();
  }
}
