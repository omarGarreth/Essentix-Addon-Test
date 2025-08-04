import { world, system, TicksPerSecond } from "@minecraft/server";

const TP_REQUESTS = new Map();
const COOLDOWNS = new Map();
const TP_COOLDOWN = 30 * TicksPerSecond; // 30 seconds

world.beforeEvents.chatSend.subscribe(event => {
    const { message, sender } = event;
    event.cancel = true;

    // cd check
    if (COOLDOWNS.has(sender.id) && message.startsWith("!")) {
        const remaining = (COOLDOWNS.get(sender.id) - system.currentTick) / TicksPerSecond;
        sender.sendMessage(`§cYou must wait ${remaining.toFixed(1)} seconds!`);
        return;
    }

    // !tpr <player>
    if (message.startsWith("!tpr ")) {
        const targetName = message.split(" ")[1];
        TP_REQUESTS.set(sender.name, targetName);
        world.getDimension("overworld").runCommandAsync(
            `tellraw @a[name="${targetName}"] {"rawtext":[{"text":"§b${sender.name} §ewants to teleport! Type §a!tpa §eor §c!tpdeny"}]}`
        );
        triggerCooldown(sender);
    }

    // !tpa (accept)
    else if (message === "!tpa") {
        for (const [requester, target] of TP_REQUESTS) {
            if (target === sender.name) {
                const requesterEntity = [...world.getPlayers()].find(p => p.name === requester);
                if (requesterEntity) {
                    playEffects(requesterEntity.location);
                    requesterEntity.teleport(sender.location);
                    playEffects(sender.location);
                    world.getDimension("overworld").runCommandAsync(
                        `playsound random.enderpearl @a[name="${requester}"] ~~~ 1 1`
                    );
                    TP_REQUESTS.delete(requester);
                }
            }
        }
    }

    // !tprandom
    else if (message === "!tprandom") {
        system.run(() => {
            playEffects(sender.location);
            world.getDimension("overworld").runCommandAsync(
                `spreadplayers ~~~ 1000 2000 false @s[name="${sender.name}"]`
            );
            system.runTimeout(() => {
                playEffects(sender.location);
                world.getDimension("overworld").runCommandAsync(
                    `playsound mob.endermen.portal @a[name="${sender.name}"] ~~~ 1 1`
                );
                sender.sendMessage("§aWhoosh! Random teleport complete!");
            }, 10);
            triggerCooldown(sender);
        });
    }
});

function playEffects(location) {
    world.getDimension("overworld").runCommandAsync(
        `particle minecraft:portal ${location.x} ${location.y} ${location.z} 1 1 1 0.1 10`
    );
    world.getDimension("overworld").runCommandAsync(
        `particle minecraft:witch_spell ${location.x} ${location.y} ${location.z} 0.5 0.5 0.5 0.1 15`
    );
}

function triggerCooldown(player) {
    COOLDOWNS.set(player.id, system.currentTick + TP_COOLDOWN);
    system.runTimeout(() => COOLDOWNS.delete(player.id), TP_COOLDOWN);
}