<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->text('image');
            $table->text('mobile_image')->nullable();
            $table->string('image_public_id')->nullable();
            $table->string('mobile_image_public_id')->nullable();
            $table->string('button_text')->nullable();
            $table->string('action_type')->default('none');
            $table->text('action_value')->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('show_sponsored_badge')->default(true);
            $table->boolean('show_section_title')->default(true);
            $table->timestampTz('start_date')->nullable();
            $table->timestampTz('end_date')->nullable();
            $table->unsignedBigInteger('click_count')->default(0);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};
