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
    jumpCount: 0,
  };
  private gravity = 1;
  private obstacles: {
    x: number;
    y: number;
    width: number;
    height: number;
    vy?: number;
    type: 'small' | 'tall' | 'double' | 'moving';
  }[] = [];

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
      } else {
        this.tryJump();
      }
    });
    this.highScore = Number(localStorage.getItem('highScore')) || 0;
    this.player = {
      x: 50,
      y: this.height - 80,
      width: 28,
      height: 40,
      vy: 0,
      jumpCount: 0,
    };
  }

  private handleInput(e: KeyboardEvent) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      this.tryJump();
    }
  }

  private tryJump() {
    if (this.player.jumpCount < 2) {
      this.player.vy = -20;
      this.player.jumpCount++;
    }
  }

  private lastObstacleX = 0;
  private minDistance = 150;
  private maxDistance = 350;

  private update() {
    this.currentSpeed = Math.min(
      this.currentSpeed + this.speedIncrement,
      this.maxSpeed
    );
    this.player.vy += this.gravity;
    this.player.y += this.player.vy;

    if (this.player.y >= this.height - this.player.height) {
      this.player.y = this.height - this.player.height;
      this.player.vy = 0;
      this.player.jumpCount = 0;
    }

    // Move obstacles
    this.obstacles.forEach((ob) => {
      ob.x -= this.currentSpeed;

      if (ob.type === 'moving' && typeof ob.vy === 'number') {
        ob.y += ob.vy;
        if (ob.y <= this.height - 100 || ob.y >= this.height - ob.height) {
          ob.vy *= -1; // bounce back
        }
      }
    });
    this.obstacles = this.obstacles.filter((ob) => ob.x + ob.width > 0);

    // // Spawn new obstacles
    // this.obstacleSpawnTimer++;
    // const canSpawn =
    //   this.obstacleSpawnTimer >= this.spawnCooldown &&
    //   this.obstacles.length < this.maxObstacles;

    // if (canSpawn) {
    //   this.spawnObstacle();
    //   this.obstacleSpawnTimer = 0;
    //   this.spawnCooldown = Math.max(40, this.spawnCooldown - 0.2);
    // }

    // ✨ Distance-based obstacle spawning
    const lastObstacle = this.obstacles[this.obstacles.length - 1];
    const lastX = lastObstacle ? lastObstacle.x + lastObstacle.width : 0;
    const distanceSinceLast = this.width - lastX;

    // Scale difficulty (lower spacing as score increases)
    this.minDistance = Math.max(100, 200 - this.score * 0.2);
    this.maxDistance = Math.max(200, 350 - this.score * 0.3);
    const spacingThreshold =
      Math.random() * (this.maxDistance - this.minDistance) + this.minDistance;

    const canSpawn =
      distanceSinceLast >= spacingThreshold &&
      this.obstacles.length < this.maxObstacles;

    if (canSpawn) {
      this.spawnObstacle();
    }

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

  private obstacleTypes = ['small', 'tall', 'double', 'moving'];
  private spawnObstacle() {
    const type = this.chooseObstacleType();
    const baseY = this.height;

    switch (type) {
      case 'small':
        this.obstacles.push({
          x: this.width,
          y: baseY - 30,
          width: 30,
          height: 30,
          type,
        });
        break;

      case 'tall':
        this.obstacles.push({
          x: this.width,
          y: baseY - 60,
          width: 24,
          height: 60,
          type,
        });
        break;

      case 'double':
        const gap = 50;
        const width = 20;
        const height = 30;
        this.obstacles.push(
          {
            x: this.width,
            y: baseY - height,
            width,
            height,
            type,
          },
          {
            x: this.width + width + gap,
            y: baseY - height,
            width,
            height,
            type,
          }
        );
        break;

      case 'moving':
        const moveHeight = 40;
        this.obstacles.push({
          x: this.width,
          y: baseY - moveHeight,
          width: 28,
          height: moveHeight,
          vy: 1.2,
          type,
        });
        break;
    }
  }

  private chooseObstacleType(): string {
    const scoreBasedDifficulty = Math.floor(this.score / 100);
    if (scoreBasedDifficulty < 3) {
      return 'small';
    } else if (scoreBasedDifficulty < 6) {
      return ['small', 'tall'][Math.floor(Math.random() * 2)];
    } else {
      return this.obstacleTypes[
        Math.floor(Math.random() * this.obstacleTypes.length)
      ];
    }
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
    this.player.jumpCount = 0;
    this.obstacles = [];
    this.currentSpeed = this.baseSpeed;
    this.score = 0;
    this.bgSkyX = 0;
    this.bgGroundX = 0;
    this.loop();
  }
}
